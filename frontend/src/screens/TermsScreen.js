import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>서비스 이용약관</Text>
        <Text style={styles.date}>최종 업데이트: 2024년 1월</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제1조 (목적)</Text>
          <Text style={styles.sectionContent}>
            본 약관은 HIPO(이하 "서비스"라 함)가 제공하는 가상 인적 자산 거래 플랫폼 서비스의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제2조 (정의)</Text>
          <Text style={styles.sectionContent}>
            1. "서비스"란 HIPO가 제공하는 가상 인적 자산 거래 플랫폼을 의미합니다.{'\n'}
            2. "이용자"란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.{'\n'}
            3. "회원"이란 서비스에 회원등록을 한 자로서, 계속적으로 서비스를 이용할 수 있는 자를 의미합니다.{'\n'}
            4. "PO"란 서비스 내에서 사용되는 가상 화폐를 의미하며, 실제 법정 화폐와 교환되지 않습니다.{'\n'}
            5. "주식"이란 회원을 대상으로 발행되는 가상 자산을 의미하며, 실제 주식이나 유가증권이 아닙니다.{'\n'}
            6. "신뢰도"란 회원의 활동 및 거래를 기반으로 산정되는 평가 지표를 의미합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제3조 (약관의 효력 및 변경)</Text>
          <Text style={styles.sectionContent}>
            1. 본 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.{'\n'}
            2. 서비스는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.{'\n'}
            3. 약관이 변경되는 경우 서비스는 변경사항을 시행일자 7일 전부터 공지합니다.{'\n'}
            4. 회원이 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단하고 탈퇴할 수 있습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제4조 (회원가입)</Text>
          <Text style={styles.sectionContent}>
            1. 회원가입은 이용자가 본 약관에 동의하고 서비스가 정한 절차에 따라 회원가입 신청을 하여 서비스가 이를 승낙함으로써 성립합니다.{'\n'}
            2. 회원은 회원가입 시 실명 및 실제 정보를 기재해야 하며, 허위정보를 기재할 경우 서비스 이용이 제한될 수 있습니다.{'\n'}
            3. 만 14세 미만의 아동은 회원가입을 할 수 없습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제5조 (서비스의 내용)</Text>
          <Text style={styles.sectionContent}>
            1. 서비스는 다음과 같은 서비스를 제공합니다:{'\n'}
            • 회원 간 가상 주식 거래{'\n'}
            • 소셜 네트워킹 기능 (게시글 작성, 댓글, 팔로우 등){'\n'}
            • 신뢰도 기반 평가 시스템{'\n'}
            • 투자 뉴스 및 활동 피드{'\n'}
            • 메시지 및 알림 기능{'\n'}
            2. 서비스는 가상 플랫폼이며, 모든 거래는 실제 금전적 가치가 없는 가상 자산으로 이루어집니다.{'\n'}
            3. 서비스에서 사용되는 PO 및 주식은 실제 법정 화폐나 유가증권이 아니며, 환금이 불가능합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제6조 (서비스 이용시간)</Text>
          <Text style={styles.sectionContent}>
            1. 서비스의 이용은 연중무휴 1일 24시간을 원칙으로 합니다.{'\n'}
            2. 서비스는 시스템 정기점검, 증설 및 교체를 위해 서비스를 일시적으로 중단할 수 있으며, 예정된 작업의 경우 사전에 공지합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제7조 (회원의 의무)</Text>
          <Text style={styles.sectionContent}>
            1. 회원은 다음 행위를 하여서는 안 됩니다:{'\n'}
            • 타인의 정보 도용{'\n'}
            • 서비스의 정보를 이용한 영리 행위{'\n'}
            • 타 회원에 대한 개인정보 무단 수집{'\n'}
            • 서비스 운영에 지장을 주는 행위{'\n'}
            • 다른 회원의 명예를 손상시키거나 불이익을 주는 행위{'\n'}
            • 외설, 폭력적인 메시지, 화상, 음성 등을 게시하는 행위{'\n'}
            • 시스템 해킹 또는 악성코드 유포 행위{'\n'}
            2. 회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항 등을 준수하여야 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제8조 (개인정보보호)</Text>
          <Text style={styles.sectionContent}>
            1. 서비스는 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다.{'\n'}
            2. 개인정보의 보호 및 사용에 대해서는 관련 법령 및 서비스의 개인정보처리방침이 적용됩니다.{'\n'}
            3. 서비스는 회원의 귀책사유로 인해 노출된 정보에 대해서는 책임지지 않습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제9조 (서비스의 중단)</Text>
          <Text style={styles.sectionContent}>
            1. 서비스는 다음 각 호의 경우 서비스 제공을 중단할 수 있습니다:{'\n'}
            • 설비의 보수 등 공사로 인한 부득이한 경우{'\n'}
            • 전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지한 경우{'\n'}
            • 기타 불가항력적 사유가 있는 경우{'\n'}
            2. 서비스는 사업 종목의 전환, 사업의 포기, 업체 간의 통합 등으로 서비스를 제공할 수 없게 되는 경우 공지사항을 통해 회원에게 통지합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제10조 (면책조항)</Text>
          <Text style={styles.sectionContent}>
            1. 서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.{'\n'}
            2. 서비스는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.{'\n'}
            3. 서비스는 회원이 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.{'\n'}
            4. 서비스는 회원 간 또는 회원과 제3자 상호간에 서비스를 매개로 하여 거래 등을 한 경우에는 책임이 면제됩니다.{'\n'}
            5. 본 서비스에서 제공하는 모든 가상 자산(PO, 주식 등)은 실제 금전적 가치가 없으며, 서비스는 이에 대한 환금이나 보상 의무가 없습니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제11조 (준거법 및 재판관할)</Text>
          <Text style={styles.sectionContent}>
            1. 서비스와 회원 간 제기된 소송은 대한민국 법을 준거법으로 합니다.{'\n'}
            2. 서비스와 회원 간 발생한 분쟁에 관한 소송은 서비스 본사 소재지를 관할하는 법원을 관할법원으로 합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제12조 (기타)</Text>
          <Text style={styles.sectionContent}>
            1. 본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.{'\n'}
            2. 본 약관의 일부 조항이 무효로 판명되더라도 나머지 조항의 효력은 유지됩니다.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            본 약관은 2024년 1월 1일부터 시행됩니다.
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
    marginBottom: 24,
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
