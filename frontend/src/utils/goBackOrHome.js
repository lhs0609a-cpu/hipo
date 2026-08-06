/**
 * 안전한 뒤로가기.
 *
 * ## 왜 필요한가
 *
 * 공유 링크나 새로고침으로 화면에 **직접** 진입하면 스택에 화면이 하나뿐이다.
 * 이때 `navigation.goBack()` 은 돌아갈 곳이 없어 아무 일도 하지 않는다.
 * 화면 안에 직접 그린 뒤로가기 버튼(헤더의 chevron)이 먹통이 되는 이유다.
 *
 * 딥링크 쪽은 linking config 의 initialRouteName 으로 스택 아래에
 * MainTabs 를 깔아 해결했지만, 그 밖의 경로(예: reset 후 진입)로도
 * 단일 스택이 될 수 있으므로 버튼 쪽에도 폴백을 둔다.
 */

/**
 * @param {object} navigation React Navigation 의 navigation 객체
 * @param {string} [fallback] 돌아갈 곳이 없을 때 이동할 화면
 */
export default function goBackOrHome(navigation, fallback = 'MainTabs') {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate(fallback);
}

export { goBackOrHome };
