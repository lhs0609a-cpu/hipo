import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

/**
 * 로그인이 필요한 기능에서 사용하는 훅
 * 로그인되지 않은 경우 팝업을 표시하고 로그인 화면으로 이동할 수 있게 함
 */
export const useRequireAuth = () => {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();

  /**
   * 로그인이 필요한 액션을 수행하기 전에 호출
   * @param {string} actionName - 수행하려는 액션 이름 (예: "주식 매수", "프로필 보기")
   * @param {Function} callback - 로그인되어 있을 경우 실행할 함수
   * @returns {boolean} - 로그인 여부
   */
  const requireAuth = (actionName, callback) => {
    if (!isAuthenticated) {
      Alert.alert(
        '로그인 필요',
        `${actionName}을(를) 하려면 로그인이 필요합니다.\n\n로그인 하시겠습니까?`,
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '로그인',
            onPress: () => {
              // 로그인 화면으로 이동
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
      return false;
    }

    if (callback) {
      callback();
    }
    return true;
  };

  /**
   * 로그인 여부만 확인 (팝업 없음)
   */
  const checkAuth = () => {
    return isAuthenticated;
  };

  /**
   * 로그인이 필요하다는 간단한 알림 표시
   */
  const showLoginRequired = (message) => {
    Alert.alert(
      '로그인 필요',
      message || '이 기능을 사용하려면 로그인이 필요합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그인하기',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  return {
    isAuthenticated,
    requireAuth,
    checkAuth,
    showLoginRequired,
  };
};

export default useRequireAuth;
