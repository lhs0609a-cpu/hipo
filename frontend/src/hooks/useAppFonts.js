import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import { FONT_ASSETS, hasFontAssets, applyFontLoadResult } from '../styles/fonts';

/**
 * 앱 서체 로딩.
 *
 * 폰트 로딩은 앱을 막지 않는다. 파일이 없거나 로딩이 실패해도 시스템 폰트로
 * 폴백해 화면은 정상적으로 뜬다. 서체 때문에 앱이 안 열리는 상황을 만들지 않는다.
 *
 * @returns {{ready: boolean, usingCustomFont: boolean}}
 *          ready 는 "이제 렌더해도 된다"는 뜻이지 "커스텀 폰트가 적용됐다"가 아니다.
 */
export default function useAppFonts() {
  const [state, setState] = useState(() => ({
    // 폰트 파일이 없으면 기다릴 이유가 없다
    ready: !hasFontAssets,
    usingCustomFont: false,
  }));

  useEffect(() => {
    if (!hasFontAssets) {
      applyFontLoadResult(false);
      return undefined;
    }

    let cancelled = false;

    Font.loadAsync(FONT_ASSETS)
      .then(() => {
        if (cancelled) return;
        applyFontLoadResult(true);
        setState({ ready: true, usingCustomFont: true });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('폰트 로딩 실패, 시스템 폰트로 진행합니다:', error?.message);
        applyFontLoadResult(false);
        setState({ ready: true, usingCustomFont: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
