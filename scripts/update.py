#!/usr/bin/env python3
"""Culture Signal refresh: public RSS and chart tables, no invented metrics.

Run from repo root: python scripts/update.py
Data caveat: these are *discovery leads*, not an algorithmic popularity ranking.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote
import xml.etree.ElementTree as ET

import feedparser
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'data' / 'feed.json'
SEED_PATH = ROOT / 'data' / 'seed.js'
CONFIG_PATH = ROOT / 'config.json'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; CultureSignalReader/1.0; +https://github.com/)','Accept':'application/rss+xml,application/xml,text/html,*/*'}
now = dt.datetime.now(dt.timezone.utc)
config = json.loads(CONFIG_PATH.read_text(encoding='utf8'))
old = json.loads(DATA_PATH.read_text(encoding='utf8'))
errors: list[str] = []


def fetch(url: str, timeout: int = 19) -> str:
    resp = requests.get(url, timeout=timeout, headers=HEADERS)
    resp.raise_for_status()
    if len(resp.content)>3_000_000:
        raise ValueError('source too large')
    return resp.text


def to_utc(value: str | dt.datetime | None) -> dt.datetime | None:
    if not value: return None
    if isinstance(value,dt.datetime):
        return value.replace(tzinfo=dt.timezone.utc) if value.tzinfo is None else value.astimezone(dt.timezone.utc)
    try:
        parsed=dt.datetime.fromisoformat(str(value).replace('Z','+00:00'))
        return parsed.replace(tzinfo=dt.timezone.utc) if parsed.tzinfo is None else parsed.astimezone(dt.timezone.utc)
    except (ValueError, TypeError):
        return None


def date_from_entry(entry):
    struct=entry.get('published_parsed') or entry.get('updated_parsed')
    if struct:
        return dt.datetime(*struct[:6],tzinfo=dt.timezone.utc)
    return None


def make_id(*parts):
    return hashlib.sha256('|'.join(parts).encode('utf8')).hexdigest()[:16]


def feed_image(entry) -> str:
    for field in ('media_thumbnail', 'media_content', 'enclosures'):
        for media in entry.get(field, []):
            url = media.get('url', '')
            media_type = media.get('type', '')
            if url.startswith('https://') and (field != 'enclosures' or media_type.startswith('image/')):
                return url
    return ''


def google_trends(geo: str) -> list[dict]:
    """Google Trends RSS ht:approx_traffic is a bucketed estimate, not exact visits."""
    xml=fetch(f'https://trends.google.com/trending/rss?geo={geo}')
    root=ET.fromstring(xml)
    ns={'ht':'https://trends.google.com/trending/rss'}
    result=[]
    for e in root.findall('.//item')[:22]:
        title=(e.findtext('title') or '').strip()
        if not title: continue
        link=e.findtext('link') or f'https://trends.google.com/trending?geo={geo}'
        approx=e.findtext('ht:approx_traffic',default='',namespaces=ns)
        pub=e.findtext('pubDate')
        from email.utils import parsedate_to_datetime
        try: observed=parsedate_to_datetime(pub).astimezone(dt.timezone.utc) if pub else now
        except (TypeError,ValueError): observed=now
        if observed>now+dt.timedelta(days=1):continue
        data={'id':'google-'+make_id(geo,title,observed.date().isoformat()),'type':'trend','title':title,'region':geo,'observed':observed.isoformat(),'source':'Google Trends Trending Now RSS','url':link,'note':'Search spike · approx traffic is an estimated bucket, not a verified total.'}
        if approx:data['metric']={'value':approx,'label':'approx. search volume'}
        result.append(data)
    return result


def google_news(q: str, category: str, max_count: int, hours: int) -> list[dict]:
    query=quote(q+' when:4d')
    xml=fetch(f'https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en')
    parsed=feedparser.parse(xml)
    result=[]
    for e in parsed.entries:
        published=date_from_entry(e)
        if published is None or published>now+dt.timedelta(hours=8) or (now-published).total_seconds()>hours*3600:
            continue
        title=re.sub(r'\s+',' ',BeautifulSoup(e.get('title',''),'html.parser').get_text(' ',strip=True))
        if not title:continue
        source=e.get('source',{})
        source_name=(source.get('title') if isinstance(source,dict) else str(source)) or 'Google News'
        item={'id':'news-'+make_id(title,category),'type':'news','category':category,'title':title[:240],'region':'US / UK','observed':published.isoformat(),'source':source_name,'url':e.get('link','https://news.google.com/'),'note':'News mention only; publication does not prove popularity.'}
        image=feed_image(e)
        if image:
            item['image']=image
            item['image_credit']=source_name
        result.append(item)
        if len(result)>=max_count:break
    return result


def spotify_weekly(region: str, max_rows: int) -> list[dict]:
    """Best-effort Kworb parser. Fail closed on ambiguous numeric positions/streams."""
    url=f'https://www.kworb.net/spotify/country/{region}_weekly.html'
    html=fetch(url,timeout=30)
    soup=BeautifulSoup(html,'html.parser')
    heading=soup.get_text(' ',strip=True)[:600]
    # Most often the source headline contains an exact YYYY/MM/DD date.
    match=re.search(r'20\d\d[/\-]\d{2}[/\-]\d{2}',heading)
    if not match:raise ValueError('Chart date not found; source layout may have changed')
    chart_date=match.group().replace('/','-')
    if to_utc(chart_date)>now+dt.timedelta(days=1):raise ValueError('future chart date')
    found=[]
    # Header is usually Pos/P+/Artist and Title/Wks/Pk/Streams/Streams+/Total.
    for table in soup.select('table'):
        headings=[t.get_text(' ',strip=True).lower() for t in table.select('thead th, tr:first-child th')]
        joined=' '.join(headings)
        if not ('streams' in joined and ('artist' in joined or 'title' in joined)):
            continue
        for tr in table.select('tr'):
            cells=tr.find_all('td',recursive=False)
            if len(cells)<6:continue
            pos=cells[0].get_text(' ',strip=True)
            if not pos.isdigit():continue
            rank=int(pos)
            if rank<1 or rank>200:continue
            # Names are in the artist/title column (typically position 2).
            artist_col=2 if len(cells)>=8 else 1
            name=cells[artist_col].get_text(' ',strip=True)
            if len(name)<4 or len(name)>180:continue
            # Find Streams header column index; parse only this numeric cell.
            stream_idx=next((i for i,h in enumerate(headings) if h=='streams'),None)
            if stream_idx is None or stream_idx>=len(cells):continue
            raw=cells[stream_idx].get_text(' ',strip=True).replace(',','').replace(' ','')
            if not raw.isdigit():continue
            value=int(raw)
            if value<50_000 or value>1_000_000_000:continue
            found.append({'id':'spotify-'+make_id(region,chart_date,str(rank),name),'type':'chart','title':f'#{rank:02d} · {name}','region':'GLOBAL' if region=='global' else 'US','observed':chart_date+'T12:00:00+00:00','source':'Kworb · Spotify weekly chart','url':url,'metric':{'value':f'{value/1e6:.2f}M','label':'weekly streams'},'note':'Weekly Spotify streams, compiled by Kworb. Chart date: '+chart_date})
            if len(found)>=max_rows:break
        if found:break
    if not found:raise ValueError('No valid chart rows; source layout may have changed')
    return found



def apple_music_charts(country: str = 'us', max_rows: int = 12) -> list[dict]:
    """Official Apple Marketing Tools RSS. Rank only; no fabricated play counts."""
    url=f'https://rss.applemarketingtools.com/api/v2/{country}/music/most-played/25/songs.json'
    payload=json.loads(fetch(url))
    entries=payload.get('feed',{}).get('results',[])
    if not isinstance(entries,list) or not entries: raise ValueError('Missing Apple chart')
    as_of=now.isoformat(timespec='seconds')
    out=[]
    for rank,entry in enumerate(entries[:max_rows],start=1):
        name=entry.get('name','');artist=entry.get('artistName','')
        if not name or not artist:continue
        item={'id':'apple-'+make_id(country,str(rank),name,artist,now.date().isoformat()),'type':'chart', 'title':f'#{rank:02d} · {artist} — {name}', 'region':country.upper(),'observed':as_of,'source':'Apple Music · official top songs RSS','url':entry.get('url',url),'metric':{'value':f'#{rank}','label':'Apple Music rank'},'note':'Chart position only. Apple does not publish stream totals via this feed.'}
        artwork=entry.get('artworkUrl100','')
        if artwork.startswith('https://'):
            item['image']=artwork
            item['image_credit']='Apple Music artwork'
        out.append(item)
    return out

def main():
    old_live=old.get('live',[]);old_charts=old.get('charts',[])
    gathered_trends=[];gathered_news=[];charts=[]
    success=0
    for region in config.get('regions',['US','GB']):
        try:
            hits=google_trends(region)
            if hits:gathered_trends.extend(hits);success+=1
            else:errors.append(f'Google Trends {region}: empty feed')
        except Exception as ex:errors.append(f'Google Trends {region}: {type(ex).__name__}: {ex}')
        time.sleep(.25)
    for topic in config.get('google_news_queries',[]):
        try:
            hits=google_news(topic['q'],topic['category'],int(config.get('max_news_per_query',4)),int(config.get('news_max_age_hours',96)))
            if hits:gathered_news.extend(hits);success+=1
            else:errors.append(f'Google News {topic["category"]}: no recent entries')
        except Exception as ex:errors.append(f'Google News {topic["category"]}: {type(ex).__name__}: {ex}')
        time.sleep(.25)
    for region in ('global','us'):
        try:
            chart=spotify_weekly(region,int(config.get('spotify_rows_per_chart',12)))
            charts.extend(chart);success+=1
        except Exception as ex:errors.append(f'Spotify {region}: {type(ex).__name__}: {ex}')
    for region in ('us','gb'):
        try:
            chart=apple_music_charts(region,int(config.get('spotify_rows_per_chart',12)))
            if chart:charts.extend(chart);success+=1
        except Exception as ex:errors.append(f'Apple Music {region}: {type(ex).__name__}: {ex}')
    # Preserve valid previous type snapshots when a provider is temporarily down.
    if not gathered_trends:gathered_trends=[i for i in old_live if i.get('type')=='trend']
    if not gathered_news:gathered_news=[i for i in old_live if i.get('type')=='news']
    if not charts:charts=old_charts
    live=[];seen=set()
    for item in gathered_trends+gathered_news:
        key=item['id']
        if key in seen:continue
        seen.add(key);live.append(item)
    live.sort(key=lambda x:x.get('observed',''),reverse=True)
    # Do not roll the timestamp forward if *every* source was inaccessible.
    output={**old,'live':live[:110],'charts':charts[:50],'errors':errors[:30], 'mode':'auto' if success else old.get('mode','editorial_snapshot'), 'updated_at':now.isoformat(timespec='seconds') if success else old.get('updated_at')}
    text=json.dumps(output,ensure_ascii=False,indent=2)+'\n'
    DATA_PATH.write_text(text,encoding='utf8')
    # Bundled seed enables the same content when opening the HTML via file://.
    SEED_PATH.write_text('window.CULTURE_SIGNAL_SEED = '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
    print(f"Sync: {success} source groups succeeded | {len(live)} live leads | {len(charts)} chart rows | {len(errors)} warnings | {output['updated_at']}")
    if success==0 and not live and not charts:
        print('No update possible. Kept last verified snapshot.',file=sys.stderr)

if __name__=='__main__':main()
