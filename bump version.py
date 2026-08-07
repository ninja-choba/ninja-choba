#!/usr/bin/env python3
# バージョン表記の整合を確認・更新するスクリプト（再現版）
#
# 対象4箇所：
#   1. index.html <meta name="app-version" content="YYYYMMDD HH:MM">
#   2. index.html <div class="version-tag">vYYYYMMDD HH:MM</div>
#   3. index.html var APP_VERSION = 'YYYYMMDD HH:MM';
#   4. sw.js       const CACHE_NAME = 'ninja-choba-vYYYYMMDDHHMM';
#
# 4箇所がずれていると、デプロイしてもService Workerが「更新なし」と
# 判断して更新バーが出ず、利用者が古い版のまま取り残される
# （過去の「Unexpected end of input」の原因）。
#
# 使い方：
#   python3 bump_version.py --check   ... 4箇所が揃っているか確認するのみ
#   python3 bump_version.py           ... 現在時刻（JST）に4箇所を揃えて更新

import re
import sys
from datetime import datetime, timezone, timedelta

INDEX_PATH = '/home/claude/index.html'
SW_PATH = '/home/claude/ninja-choba/sw.js'

JST = timezone(timedelta(hours=9))


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def extract(index_html, sw_js):
    meta = re.search(r'<meta name="app-version" content="([^"]+)">', index_html)
    tag = re.search(r'class="version-tag"[^>]*>v([^<]+)</div>', index_html)
    appver = re.search(r"var APP_VERSION = '([^']+)';", index_html)
    cache = re.search(r"const CACHE_NAME = 'ninja-choba-v(\d+)';", sw_js)
    return meta, tag, appver, cache


def check():
    index_html = read(INDEX_PATH)
    sw_js = read(SW_PATH)
    meta, tag, appver, cache = extract(index_html, sw_js)

    if not (meta and tag and appver and cache):
        print('バージョン表記が一部見つかりませんでした')
        sys.exit(1)

    v_meta, v_tag, v_app = meta.group(1), tag.group(1), appver.group(1)
    v_cache = cache.group(1)
    v_expected_cache = v_meta.replace(' ', '').replace(':', '')

    ok_html = (v_meta == v_tag == v_app)
    ok_sw = (v_cache == v_expected_cache)

    if ok_html:
        print('index.html内の3箇所（meta / version-tag / APP_VERSION）はそろっている：' + v_meta)
    else:
        print('index.html内で食い違いがあります：meta=%s / version-tag=%s / APP_VERSION=%s' % (v_meta, v_tag, v_app))

    if ok_sw:
        print('sw.jsのCACHE_NAMEもそろっている：' + v_cache)
    else:
        print('sw.jsのCACHE_NAMEが食い違っています：期待=%s / 実際=%s' % (v_expected_cache, v_cache))

    if not (ok_html and ok_sw):
        sys.exit(1)


def bump():
    now = datetime.now(JST)
    v_spaced = now.strftime('%Y%m%d %H:%M')
    v_compact = now.strftime('%Y%m%d%H%M')

    index_html = read(INDEX_PATH)
    sw_js = read(SW_PATH)

    index_html = re.sub(
        r'<meta name="app-version" content="[^"]+">',
        '<meta name="app-version" content="%s">' % v_spaced,
        index_html)
    index_html = re.sub(
        r'(class="version-tag"[^>]*>)v[^<]+(</div>)',
        r'\1v%s\2' % v_spaced,
        index_html)
    index_html = re.sub(
        r"var APP_VERSION = '[^']+';",
        "var APP_VERSION = '%s';" % v_spaced,
        index_html)
    sw_js = re.sub(
        r"const CACHE_NAME = 'ninja-choba-v\d+';",
        "const CACHE_NAME = 'ninja-choba-v%s';" % v_compact,
        sw_js)

    write(INDEX_PATH, index_html)
    write(SW_PATH, sw_js)
    print('バージョンを %s に揃えました' % v_spaced)


if __name__ == '__main__':
    if '--check' in sys.argv:
        check()
    else:
        bump()
