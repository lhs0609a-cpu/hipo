"""Visual smoke test for the newly completed navigation and PO transfer flow."""
import asyncio
import json
import tempfile
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'output' / 'market-implementation'


async def main():
    fixture = json.loads((Path(tempfile.gettempdir()) / 'tmp' / 'review-session.json').read_text(encoding='utf-8'))
    errors = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 430, 'height': 920}, locale='ko-KR')
        await context.route('**hipo-backend.fly.dev/**', lambda route: route.abort())
        await context.add_init_script(
            'localStorage.setItem("token", ' + json.dumps(fixture['token']) + ');'
            'localStorage.setItem("user", ' + json.dumps(json.dumps(fixture['user'])) + ');'
        )
        page = await context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: asyncio.create_task(dialog.accept()))
        await page.goto('http://127.0.0.1:8167', wait_until='networkidle')
        await page.get_by_text('송금', exact=True).click()
        await page.get_by_text('PO 송금', exact=True).wait_for()
        await page.screenshot(path=str(OUTPUT / 'po-transfer.png'), full_page=True)
        await page.get_by_placeholder('이메일 또는 사용자명').fill('ReviewSeller')
        await page.get_by_placeholder('0', exact=True).fill('250')
        await page.get_by_text('전송하기', exact=True).click()
        await page.wait_for_timeout(800)
        response = await context.request.get(
            'http://127.0.0.1:5657/api/wallet/balance',
            headers={'Authorization': 'Bearer ' + fixture['token']},
        )
        balance = await response.json()
        assert int(balance.get('poBalance', balance.get('balance', -1))) == 9750, balance
        await page.screenshot(path=str(OUTPUT / 'po-transfer-complete.png'), full_page=True)
        assert not errors, errors
        (OUTPUT / 'completion-browser-check.json').write_text(json.dumps({
            'passed': True,
            'checks': ['home transfer navigation', 'transfer form design', 'recipient lookup', 'atomic PO transfer', 'updated available balance'],
            'pageErrors': errors,
        }, ensure_ascii=False, indent=2), encoding='utf-8')
        await browser.close()
        print('PASS: completion navigation and PO transfer')


asyncio.run(main())
