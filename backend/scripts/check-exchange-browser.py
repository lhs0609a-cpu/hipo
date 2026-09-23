import asyncio
import json
import re
import tempfile
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'output' / 'market-implementation'

async def main():
    fixture = json.loads((Path(tempfile.gettempdir()) / 'tmp' / 'review-session.json').read_text(encoding='utf-8'))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 1080}, locale='ko-KR')
        # Smoke tests must never send fixture credentials to the live deployment.
        await context.route('**hipo-backend.fly.dev/**', lambda route: route.abort())
        await context.add_init_script('localStorage.setItem("token", ' + json.dumps(fixture['token']) + '); localStorage.setItem("user", ' + json.dumps(json.dumps(fixture['user'])) + ');')
        page = await context.new_page()
        errors, dialogs = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        async def dismiss(dialog):
            dialogs.append(dialog.message)
            await dialog.accept()
        page.on('dialog', dismiss)
        await page.goto('http://127.0.0.1:8167', wait_until='networkidle')
        creator = page.get_by_text('ReviewCreator', exact=True)
        try:
            await creator.first.wait_for(timeout=20000)
        except Exception:
            print((await page.locator('body').inner_text())[:4000])
            print(errors)
            raise
        await creator.first.click()
        await page.get_by_placeholder('0', exact=True).fill('3')
        await page.get_by_text('매수하기', exact=True).click()
        await page.wait_for_function('document.body.innerText.includes("9,700")')
        headers = {'Authorization': 'Bearer ' + fixture['token']}
        account = await context.request.get('http://127.0.0.1:5657/api/stock-orders/stock/' + fixture['stockId'] + '/account', headers=headers)
        data = await account.json()
        assert data['shares'] == 3 and data['availableBalance'] == 9700, data
        await page.screenshot(path=str(OUTPUT / 'stock-detail.png'), full_page=True)
        await page.get_by_text('호가', exact=True).click()
        await page.get_by_text('총 37주', exact=True).wait_for()
        await page.screenshot(path=str(OUTPUT / 'order-book.png'), full_page=True)
        await page.get_by_text('지정가/손절/익절 주문하기', exact=True).click()
        await page.get_by_placeholder('수량 입력', exact=True).fill('2')
        await page.get_by_placeholder('가격 입력', exact=True).fill('90')
        await page.get_by_text('매수 주문', exact=True).click()
        await page.get_by_text('정정', exact=True).wait_for()
        await page.get_by_text('정정', exact=True).click()
        await page.get_by_label('정정 가격').fill('91')
        await page.get_by_text('정정하기', exact=True).click()
        await page.get_by_text('미체결 잔량 정정', exact=True).wait_for(state='hidden')
        await page.screenshot(path=str(OUTPUT / 'orders.png'), full_page=True)
        await page.get_by_text('취소', exact=True).first.click()
        await page.get_by_text('대기 중인 주문이 없습니다', exact=True).wait_for()
        # The two wallet entry points must display the same reserved buying power.
        reserved_order = await context.request.post('http://127.0.0.1:5657/api/stock-orders', headers=headers,
            data={'stockId': fixture['stockId'], 'orderType': 'BUY', 'orderMode': 'limit', 'quantity': 2, 'limitPrice': 90})
        reserved_data = await reserved_order.json()
        assert reserved_order.status == 200, reserved_data
        await page.goto('http://127.0.0.1:8167', wait_until='networkidle')
        await page.get_by_text('메뉴', exact=True).click()
        await page.get_by_text('📊 내역', exact=True).click()
        await page.get_by_text(re.compile('사용 가능 9,520')).wait_for()
        await page.screenshot(path=str(OUTPUT / 'wallet.png'), full_page=True)
        await page.goto('http://127.0.0.1:8167', wait_until='networkidle')
        await page.get_by_text('메뉴', exact=True).click()
        await page.get_by_text('💳 충전', exact=True).click()
        await page.get_by_text(re.compile('사용 가능 9,520')).wait_for()
        await page.screenshot(path=str(OUTPUT / 'po-wallet.png'), full_page=True)
        await page.get_by_text('거래내역', exact=True).click()
        await page.get_by_text('3주 매수', exact=True).wait_for()
        await page.screenshot(path=str(OUTPUT / 'po-history.png'), full_page=True)
        await context.request.delete('http://127.0.0.1:5657/api/stock-orders/' + reserved_data['order']['id'], headers=headers)
        assert not errors, errors
        (OUTPUT / 'browser-check.json').write_text(json.dumps({'passed': True, 'checks': ['market buy', 'available balance', 'real remaining order book', 'limit order', 'amend order', 'cancel order', 'wallet reservations', 'PO wallet balance', 'PO trade ledger'], 'pageErrors': errors, 'dialogs': dialogs}, ensure_ascii=False, indent=2), encoding='utf-8')
        await browser.close()
        print('PASS: browser market buy, depth, limit order, amendment, cancellation')

asyncio.run(main())
