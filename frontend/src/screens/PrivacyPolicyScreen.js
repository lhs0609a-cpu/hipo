import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>개인정보 처리방침</Text>
        <Text style={styles.date}>최종 업데이트: 2024년 1월</Text>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            HIPO(이하 "서비스")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수하고 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 개인정보의 수집 및 이용목적</Text>
          <Text style={styles.sectionContent}>
            서비스는 다음의 목적을 위하여 개인정보를 수집 및 이용합니다:{'\n\n'}
            가. 회원 관리{'\n'}
            • 회원제 서비스 이용에 따른 본인확인{'\n'}
            • 개인 식별{'\n'}
            • 불량회원의 부정 이용 방지와 비인가 사용 방지{'\n'}
            • 가입 의사 확인{'\n'}
            • 분쟁 조정을 위한 기록보존{'\n\n'}
            나. 서비스 제공{'\n'}
            • 가상 주식 거래 서비스 제공{'\n'}
            • 콘텐츠 제공{'\n'}
            • 맞춤형 서비스 제공{'\n'}
            • 본인인증{'\n\n'}
            다. 마케팅 및 광고 활용{'\n'}
            • 신규 서비스 개발 및 맞춤 서비스 제공{'\n'}
            • 이벤트 및 광고성 정보 제공{'\n'}
            • 서비스 이용에 대한 통계
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 수집하는 개인정보의 항목</Text>
          <Text style={styles.sectionContent}>
            가. 필수항목{'\n'}
            • 이메일 주소{'\n'}
            • 비밀번호 (암호화 저장){'\n'}
            • 사용자명{'\n'}
            • 서비스 이용 기록{'\n\n'}
            나. 선택항목{'\n'}
            • 프로필 이미지{'\n'}
            • 자기소개{'\n\n'}
            다. 자동 수집 항목{'\n'}
            • IP 주소{'\n'}
            • 쿠키{'\n'}
            • 서비스 이용 기록{'\n'}
            • 방문 기록{'\n'}
            • 기기 정보{'\n'}
            • 위치 정보 (선택적 권한 허용 시)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 개인정보의 수집 방법</Text>
          <Text style={styles.sectionContent}>
            서비스는 다음과 같은 방법으로 개인정보를 수집합니다:{'\n'}
            • 회원가입 및 서비스 이용 과정에서 이용자가 개인정보 수집에 대해 동의하고 직접 입력하는 경우{'\n'}
            • 고객센터를 통한 상담 과정에서 웹페이지, 메일, 팩스, 전화 등을 통해 수집하는 경우{'\n'}
            • 서비스 이용 과정에서 자동으로 생성되어 수집되는 경우
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 개인정보의 보유 및 이용기간</Text>
          <Text style={styles.sectionContent}>
            가. 회원 탈퇴 시까지{'\n'}
            • 단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지{'\n\n'}
            나. 관련 법령에 의한 정보보유 사유{'\n'}
            상법 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 법령에서 정한 일정한 기간 동안 개인정보를 보관합니다:{'\n\n'}
            • 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법){'\n'}
            • 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법){'\n'}
            • 소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법){'\n'}
            • 표시·광고에 관한 기록: 6개월 (전자상거래법){'\n'}
            • 웹사이트 방문기록: 3개월 (통신비밀보호법)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 개인정보의 파기절차 및 방법</Text>
          <Text style={styles.sectionContent}>
            가. 파기절차{'\n'}
            이용자가 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 저장된 후 파기됩니다.{'\n\n'}
            나. 파기방법{'\n'}
            • 전자적 파일 형태의 정보: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제{'\n'}
            • 종이에 출력된 개인정보: 분쇄기로 분쇄하거나 소각
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. 개인정보 제3자 제공</Text>
          <Text style={styles.sectionContent}>
            서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:{'\n'}
            • 이용자가 사전에 동의한 경우{'\n'}
            • 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. 개인정보 처리위탁</Text>
          <Text style={styles.sectionContent}>
            서비스는 서비스 이행을 위해 아래와 같이 개인정보 처리업무를 외부 전문업체에 위탁하여 처리하고 있습니다:{'\n\n'}
            • 위탁받는 자: AWS (Amazon Web Services){'\n'}
            • 위탁하는 업무의 내용: 서비스 인프라 제공 및 관리{'\n\n'}
            서비스는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. 이용자 및 법정대리인의 권리와 그 행사방법</Text>
          <Text style={styles.sectionContent}>
            이용자 및 법정 대리인은 언제든지 다음의 권리를 행사할 수 있습니다:{'\n'}
            • 개인정보 열람 요구{'\n'}
            • 오류 등이 있을 경우 정정 요구{'\n'}
            • 삭제 요구{'\n'}
            • 처리정지 요구{'\n\n'}
            권리 행사는 서비스 내 설정 메뉴 또는 고객센터를 통해 하실 수 있으며, 서비스는 이에 대해 지체 없이 조치하겠습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. 개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항</Text>
          <Text style={styles.sectionContent}>
            가. 쿠키의 사용 목적{'\n'}
            • 이용자의 접속 빈도나 방문 시간 등을 분석{'\n'}
            • 이용자의 취향과 관심분야를 파악{'\n'}
            • 각종 이벤트 참여 정도 및 방문 횟수 파악{'\n'}
            • 타겟 마케팅 및 개인 맞춤 서비스 제공{'\n\n'}
            나. 쿠키 설정 거부 방법{'\n'}
            이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. 개인정보 보호책임자</Text>
          <Text style={styles.sectionContent}>
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:{'\n\n'}
            개인정보 보호책임자{'\n'}
            • 이메일: privacy@hipo.com{'\n'}
            • 전화번호: 02-1234-5678{'\n\n'}
            이용자는 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. 개인정보의 안전성 확보조치</Text>
          <Text style={styles.sectionContent}>
            서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:{'\n'}
            • 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육{'\n'}
            • 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치{'\n'}
            • 물리적 조치: 전산실, 자료보관실 등의 접근통제
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. 개인정보 처리방침의 변경</Text>
          <Text style={styles.sectionContent}>
            이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. 만 14세 미만 아동의 개인정보 보호</Text>
          <Text style={styles.sectionContent}>
            서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 만 14세 미만 아동이 회원가입을 시도할 경우 가입이 거부됩니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. 권익침해 구제방법</Text>
          <Text style={styles.sectionContent}>
            개인정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다:{'\n\n'}
            • 개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr){'\n'}
            • 개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr){'\n'}
            • 대검찰청: (국번없이) 1301 (www.spo.go.kr){'\n'}
            • 경찰청: (국번없이) 182 (ecrm.cyber.go.kr)
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            본 개인정보 처리방침은 2024년 1월 1일부터 시행됩니다.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  intro: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  footer: {
    marginTop: 12,
    marginBottom: 40,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
});
