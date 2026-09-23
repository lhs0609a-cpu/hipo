import React from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const hero = require('../../assets/brand/welcome-people.png');

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.topbar}>
            <Text style={styles.wordmark}>HIPO.</Text>
            <View style={styles.pill}><View style={styles.liveDot} /><Text style={styles.pillText}>사람을 발견하는 마켓</Text></View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>DISCOVER PEOPLE EARLY</Text>
            <Text style={styles.title}>좋아하는 사람의{`\n`}다음을 먼저 만나요</Text>
            <Text style={styles.body}>가능성을 발견하고 응원하고,{`\n`}함께 성장하는 가장 새로운 방법.</Text>
          </View>

          <LinearGradient colors={['#EEF4FF', '#F7F8FF']} style={styles.visual}>
            <View style={styles.orbOne} /><View style={styles.orbTwo} />
            <Image source={hero} style={styles.hero} resizeMode="contain" />
            <View style={styles.signalCard}>
              <View style={styles.signalIcon}><Ionicons name="sparkles" size={16} color="#2F6BFF" /></View>
              <View><Text style={styles.signalTitle}>가능성 발견</Text><Text style={styles.signalCopy}>지금 주목받는 사람을 한눈에</Text></View>
            </View>
          </LinearGradient>

          <View style={styles.benefits}>
            <View style={styles.benefit}><Ionicons name="gift-outline" size={17} color="#2F6BFF" /><Text style={styles.benefitText}>첫 10,000 PO</Text></View>
            <View style={styles.divider} />
            <View style={styles.benefit}><Ionicons name="shield-checkmark-outline" size={17} color="#2F6BFF" /><Text style={styles.benefitText}>안전한 모의 거래</Text></View>
            <View style={styles.divider} />
            <View style={styles.benefit}><Ionicons name="people-outline" size={17} color="#2F6BFF" /><Text style={styles.benefitText}>크리에이터 커뮤니티</Text></View>
          </View>

          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.primaryText}>무료로 시작하기</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryText}>이미 계정이 있어요</Text>
          </Pressable>
          <Pressable style={styles.guest} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.guestText}>먼저 둘러보기</Text><Ionicons name="chevron-forward" size={15} color="#6B7684" />
          </Pressable>
          <Text style={styles.notice}>PO와 사람 주식은 HIPO 서비스 안에서만 사용하는 가상 자산이며 실제 금융상품이 아니에요.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flexGrow: 1, alignItems: 'center' },
  shell: { width: '100%', maxWidth: 520, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { fontSize: 23, fontWeight: '900', letterSpacing: -1, color: '#121926' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F2F5F9', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2F6BFF' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#536071' },
  copy: { marginTop: 42 },
  eyebrow: { color: '#2F6BFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginBottom: 13 },
  title: { color: '#121926', fontSize: 35, lineHeight: 44, fontWeight: '900', letterSpacing: -1.3 },
  body: { color: '#6B7684', fontSize: 16, lineHeight: 25, fontWeight: '500', marginTop: 14 },
  visual: { height: 310, borderRadius: 32, marginTop: 28, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: '109%', marginTop: -12 },
  orbOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(47,107,255,0.09)', top: -70, left: -40 },
  orbTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,126,103,0.09)', bottom: -30, right: -20 },
  signalCard: { position: 'absolute', left: 15, right: 15, bottom: 14, minHeight: 60, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.94)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 11, shadowColor: '#4A67A1', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 7 } },
  signalIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },
  signalTitle: { color: '#202B3C', fontSize: 13, fontWeight: '800' },
  signalCopy: { color: '#8B95A1', fontSize: 11, marginTop: 3 },
  benefits: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, paddingHorizontal: 4 },
  benefit: { flex: 1, alignItems: 'center', gap: 6 },
  benefitText: { fontSize: 10, fontWeight: '700', color: '#536071', textAlign: 'center' },
  divider: { width: 1, height: 25, backgroundColor: '#E7ECF2' },
  primary: { height: 58, borderRadius: 18, backgroundColor: '#2F6BFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondary: { height: 56, borderRadius: 18, backgroundColor: '#F2F5F9', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#2D3748', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  guest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  guestText: { color: '#6B7684', fontSize: 13, fontWeight: '700' },
  notice: { color: '#A1AAB7', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 18, paddingHorizontal: 20 },
});
