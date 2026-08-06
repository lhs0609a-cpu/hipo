import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { authAPI } from '../services/api';
import {
  consumePendingAuthResult,
  startAuthCodeListener,
} from '../utils/oauthCallback';

const AuthContext = createContext();

const ONBOARDING_COMPLETED_KEY = '@hipo_onboarding_completed';
const TOKEN_REFRESH_THRESHOLD = 60 * 1000; // 만료 1분 전에 갱신

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  // 구글 로그인 실패 사유. 리다이렉트로 돌아온 뒤라 화면 쪽에서 알려줄 방법이 없다
  const [oauthError, setOauthError] = useState(null);
  const refreshTimerRef = useRef(null);

  // 토큰 갱신 함수
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const response = await api.post('/auth/refresh', { refreshToken });

      if (response.data.success) {
        const { accessToken, expiresIn } = response.data;

        // 새 Access Token 저장
        await AsyncStorage.setItem('token', accessToken);
        await AsyncStorage.setItem('accessToken', accessToken);

        // 다음 갱신 스케줄링
        scheduleTokenRefresh(expiresIn);

        console.log('Access token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);

      // Refresh Token도 만료된 경우 로그아웃
      if (error.response?.data?.code === 'REFRESH_TOKEN_EXPIRED') {
        console.log('Refresh token expired, logging out');
        await forceLogout();
      }

      return false;
    }
  }, []);

  // 토큰 갱신 스케줄링
  const scheduleTokenRefresh = useCallback((expiresIn) => {
    // 기존 타이머 취소
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // expiresIn은 초 단위, 만료 1분 전에 갱신
    const refreshTime = (expiresIn * 1000) - TOKEN_REFRESH_THRESHOLD;

    if (refreshTime > 0) {
      console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000)} seconds`);
      refreshTimerRef.current = setTimeout(() => {
        refreshAccessToken();
      }, refreshTime);
    }
  }, [refreshAccessToken]);

  // 강제 로그아웃
  const forceLogout = async () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    await AsyncStorage.multiRemove(['token', 'accessToken', 'refreshToken', 'user']);
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * 인증 응답을 저장하고 로그인 상태로 전환한다.
   *
   * 이메일 로그인 / 회원가입 / 구글 코드 교환이 모두 같은 모양의 응답
   * (accessToken, refreshToken, user, expiresIn)을 주므로 한 곳에서 처리한다.
   */
  const persistSession = async ({ accessToken, refreshToken, token, user: sessionUser, expiresIn }) => {
    // accessToken 우선, 없으면 token 사용 (하위 호환성)
    const finalAccessToken = accessToken || token;
    await AsyncStorage.setItem('token', finalAccessToken);
    await AsyncStorage.setItem('accessToken', finalAccessToken);

    if (refreshToken) {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }

    await AsyncStorage.setItem('user', JSON.stringify(sessionUser));

    setUser(sessionUser);
    setIsAuthenticated(true);

    if (refreshToken && expiresIn) {
      scheduleTokenRefresh(expiresIn);
    }
  };

  /**
   * 구글 콜백이 준 일회용 코드를 토큰으로 교환해 로그인한다.
   *
   * 코드는 서버에서 2분 뒤 만료되고 한 번만 쓸 수 있다. 뒤로 가기나 새로고침으로
   * 같은 코드가 다시 오면 서버가 AUTH_CODE_INVALID 로 거절한다.
   */
  const loginWithGoogleCode = async (code) => {
    try {
      const response = await authAPI.exchangeGoogleCode(code);
      await persistSession(response.data);
      setOauthError(null);
      return { success: true };
    } catch (error) {
      console.error('Google code exchange failed:', error);

      const message =
        error.response?.data?.error ||
        (error.request
          ? '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
          : '구글 로그인을 완료하지 못했습니다. 다시 시도해주세요.');

      setOauthError(message);
      return { success: false, error: message };
    }
  };

  // 앱이 떠 있는 동안 딥링크로 돌아오는 경우 (네이티브). 웹은 전체 페이지 로드라
  // checkAuth 의 consumePendingAuthResult 가 처리한다.
  useEffect(() => startAuthCodeListener((code) => {
    loginWithGoogleCode(code);
  }), []);

  useEffect(() => {
    checkAuth();

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // API 인터셉터 설정 - 토큰 만료 시 자동 갱신
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // 토큰 만료 에러이고, 재시도하지 않은 경우
        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 'TOKEN_EXPIRED' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          const refreshed = await refreshAccessToken();

          if (refreshed) {
            // 새 토큰으로 원래 요청 재시도
            const newToken = await AsyncStorage.getItem('token');
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            // 갱신 실패 시 로그아웃
            await forceLogout();
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken]);

  const checkAuth = async () => {
    try {
      // 온보딩 완료 여부 확인
      const onboardingDone = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      setOnboardingCompleted(onboardingDone === 'true');

      /**
       * 구글 로그인 리다이렉트로 돌아왔는지 먼저 본다.
       *
       * 저장된 토큰 확인보다 앞서야 한다. 다른 계정으로 구글 로그인을 했는데
       * 예전 세션이 남아 있으면 그대로 예전 계정으로 들어가 버린다.
       */
      const { code: oauthCode, error: oauthFailure } = await consumePendingAuthResult();

      if (oauthFailure) {
        setOauthError('구글 로그인에 실패했습니다. 다시 시도해주세요.');
      }

      if (oauthCode) {
        const result = await loginWithGoogleCode(oauthCode);
        if (result.success) return; // finally 에서 loading 을 내린다
      }

      // 인증 상태 확인
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const savedUser = await AsyncStorage.getItem('user');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);

        // Refresh Token이 있으면 토큰 갱신 스케줄링
        // 15분 기본값으로 설정 (서버에서 받은 expiresIn이 없는 경우)
        if (refreshToken) {
          scheduleTokenRefresh(15 * 60);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setOnboardingCompleted(true);
    } catch (error) {
      console.error('온보딩 완료 저장 실패:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      await persistSession(response.data);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = '로그인에 실패했습니다';

      if (error.response) {
        errorMessage = error.response.data?.message ||
                       error.response.data?.error ||
                       `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n\n인터넷 연결을 확인하거나\n잠시 후 다시 시도해주세요.';
      } else {
        errorMessage = error.message || '알 수 없는 오류가 발생했습니다';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      await persistSession(response.data);

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);

      let errorMessage = '회원가입에 실패했습니다';

      if (error.response) {
        errorMessage = error.response.data?.message ||
                       error.response.data?.error ||
                       `서버 오류 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다.\n\n가능한 원인:\n• 인터넷 연결 확인\n• 서버가 점검 중일 수 있습니다\n• 잠시 후 다시 시도해주세요';
      } else {
        errorMessage = error.message || '알 수 없는 오류가 발생했습니다';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      // 서버에 로그아웃 요청 (Refresh Token 무효화)
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // 타이머 취소
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // 로컬 스토리지 정리
    await AsyncStorage.multiRemove(['token', 'accessToken', 'refreshToken', 'user']);
    setUser(null);
    setIsAuthenticated(false);
  };

  const logoutAllDevices = async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout all error:', error);
    }

    await logout();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      onboardingCompleted,
      oauthError,
      clearOAuthError: () => setOauthError(null),
      login,
      register,
      logout,
      logoutAllDevices,
      updateUser,
      completeOnboarding,
      refreshAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
