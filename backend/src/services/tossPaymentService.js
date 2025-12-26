const axios = require('axios');

class TossPaymentService {
  constructor() {
    // 토스페이먼츠 API 키 (테스트용)
    this.secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';
    this.clientKey = process.env.TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
    this.apiUrl = 'https://api.tosspayments.com/v1';

    // Base64 인코딩된 시크릿 키
    this.encodedKey = Buffer.from(this.secretKey + ':').toString('base64');
  }

  /**
   * 결제 승인 (토스페이먼츠)
   * @param {string} paymentKey - 토스페이먼츠 결제 키
   * @param {string} orderId - 주문 ID
   * @param {number} amount - 결제 금액
   * @returns {Promise<object>} 결제 승인 결과
   */
  async confirmPayment(paymentKey, orderId, amount) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/payments/confirm`,
        {
          paymentKey,
          orderId,
          amount
        },
        {
          headers: {
            'Authorization': `Basic ${this.encodedKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('토스페이먼츠 결제 승인 실패:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * 결제 취소 (환불)
   * @param {string} paymentKey - 토스페이먼츠 결제 키
   * @param {string} cancelReason - 취소 사유
   * @param {number} cancelAmount - 취소 금액 (부분 취소 가능)
   * @returns {Promise<object>} 취소 결과
   */
  async cancelPayment(paymentKey, cancelReason, cancelAmount = null) {
    try {
      const requestBody = {
        cancelReason
      };

      if (cancelAmount) {
        requestBody.cancelAmount = cancelAmount;
      }

      const response = await axios.post(
        `${this.apiUrl}/payments/${paymentKey}/cancel`,
        requestBody,
        {
          headers: {
            'Authorization': `Basic ${this.encodedKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('토스페이먼츠 결제 취소 실패:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * 결제 조회
   * @param {string} paymentKey - 토스페이먼츠 결제 키
   * @returns {Promise<object>} 결제 정보
   */
  async getPayment(paymentKey) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${paymentKey}`,
        {
          headers: {
            'Authorization': `Basic ${this.encodedKey}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('토스페이먼츠 결제 조회 실패:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * 주문 ID로 결제 조회
   * @param {string} orderId - 주문 ID
   * @returns {Promise<object>} 결제 정보
   */
  async getPaymentByOrderId(orderId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Basic ${this.encodedKey}`
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('토스페이먼츠 주문 조회 실패:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * 결제 방법 추출 (토스 응답에서)
   * @param {object} tossResponse - 토스페이먼츠 응답
   * @returns {string} 결제 방법 (CARD, TRANSFER, TOSS, NAVERPAY, KAKAOPAY 등)
   */
  extractPaymentMethod(tossResponse) {
    const method = tossResponse.method || 'OTHER';

    // 토스페이먼츠 응답 매핑
    const methodMap = {
      '카드': 'CARD',
      '가상계좌': 'TRANSFER',
      '계좌이체': 'TRANSFER',
      '간편결제': this.extractEasyPayProvider(tossResponse),
      '휴대폰': 'MOBILE',
      '문화상품권': 'GIFT_CERTIFICATE',
      '도서문화상품권': 'GIFT_CERTIFICATE',
      '게임문화상품권': 'GIFT_CERTIFICATE'
    };

    return methodMap[method] || 'OTHER';
  }

  /**
   * 간편결제 제공자 추출
   * @param {object} tossResponse - 토스페이먼츠 응답
   * @returns {string} 간편결제 제공자
   */
  extractEasyPayProvider(tossResponse) {
    const provider = tossResponse.easyPay?.provider || tossResponse.provider;

    if (!provider) return 'OTHER';

    const providerMap = {
      '토스페이': 'TOSS',
      '네이버페이': 'NAVERPAY',
      '카카오페이': 'KAKAOPAY',
      '페이코': 'PAYCO',
      '삼성페이': 'SAMSUNGPAY',
      'TOSSPAY': 'TOSS',
      'NAVERPAY': 'NAVERPAY',
      'KAKAOPAY': 'KAKAOPAY',
      'PAYCO': 'PAYCO',
      'SAMSUNGPAY': 'SAMSUNGPAY'
    };

    return providerMap[provider] || 'OTHER';
  }

  /**
   * 보너스 계산
   * @param {number} amount - 충전 금액
   * @returns {object} { bonusAmount, totalAmount, bonusRate }
   */
  calculateBonus(amount) {
    let bonusRate = 0;

    if (amount >= 50000) {
      bonusRate = 0.20; // 20%
    } else if (amount >= 30000) {
      bonusRate = 0.15; // 15%
    } else if (amount >= 10000) {
      bonusRate = 0.10; // 10%
    } else if (amount >= 5000) {
      bonusRate = 0.05; // 5%
    }

    const bonusAmount = Math.floor(amount * bonusRate);
    const totalAmount = amount + bonusAmount;

    return {
      bonusAmount,
      totalAmount,
      bonusRate: bonusRate * 100 // 퍼센트로 변환
    };
  }

  /**
   * 클라이언트 키 가져오기 (프론트엔드에서 사용)
   * @returns {string} 클라이언트 키
   */
  getClientKey() {
    return this.clientKey;
  }
}

module.exports = new TossPaymentService();
