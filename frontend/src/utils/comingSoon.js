/**
 * 아직 만들어지지 않은 기능 안내.
 *
 * ## 왜 필요한가
 *
 * 앱 곳곳에 존재하지 않는 화면으로 가는 버튼이 있었다.
 * `navigation.navigate('LoginHistory')` 처럼 등록된 적 없는 이름을 부르면
 * React Navigation 은 그냥 아무 일도 하지 않는다. 사용자 입장에서는
 * 버튼을 눌렀는데 화면이 안 바뀌니 앱이 멈춘 것처럼 보인다.
 *
 * 없는 기능은 없다고 말하는 편이 낫다. 화면이 실제로 만들어지면
 * 이 호출을 navigation.navigate 로 바꾸면 된다.
 */

import { Alert, Platform } from 'react-native';

/**
 * @param {string} feature 기능 이름 (예: '로그인 기록')
 */
export default function comingSoon(feature) {
  const message = `${feature} 기능은 준비 중입니다.`;

  if (Platform.OS === 'web') {
    alert(message);
  } else {
    Alert.alert('준비 중', message);
  }
}

export { comingSoon };
