/**
 * 이모지 → Ionicons 매핑
 *
 * ## 왜 이모지를 걷어내는가
 *
 * 이모지는 OS·버전·기기마다 다른 그림으로 렌더된다. 같은 💰 가 iOS 에서는
 * 입체적인 돈다발, Android 에서는 납작한 지폐, 웹에서는 또 다른 모양으로 나온다.
 * 앱의 인상이 우리 손을 떠난다.
 *
 * 게다가 이모지는 크기·색을 우리가 정할 수 없다. 아이콘 하나만 유독 크거나
 * 알록달록해서 화면의 톤을 깨뜨린다.
 *
 * Ionicons 는 단색 벡터라 크기·색을 스타일로 통제할 수 있고 어디서나 같게 보인다.
 *
 * ## 사용
 *
 * `@expo/vector-icons` 의 아이콘은 내부적으로 텍스트라, 기존 Text 스타일을
 * 그대로 넘겨도 fontSize/color 가 그대로 먹는다.
 *
 *   <Text style={styles.icon}>💬</Text>
 *     ↓
 *   <Ionicons name="chatbubble-outline" style={styles.icon} />
 */

/**
 * 톤앤매너 원칙: 기본은 outline 을 쓴다.
 * 채워진(filled) 아이콘은 "선택됨/활성" 상태에만 쓴다.
 */
export const EMOJI_ICON = {
  // 소통
  '💬': 'chatbubble-outline',
  '📢': 'megaphone-outline',
  '🔔': 'notifications-outline',
  '📌': 'bookmark-outline',
  '🔗': 'link-outline',
  '📩': 'mail-outline',
  '✉️': 'mail-outline',

  // 금융·거래
  '💰': 'wallet-outline',
  '💵': 'cash-outline',
  '💸': 'trending-down-outline',
  '💎': 'diamond-outline',
  '💼': 'briefcase-outline',
  '🏦': 'business-outline',
  '🎫': 'ticket-outline',
  '🧾': 'receipt-outline',

  // 지표·차트
  '📊': 'bar-chart-outline',
  '📈': 'trending-up-outline',
  '📉': 'trending-down-outline',
  '📋': 'clipboard-outline',
  '📄': 'document-text-outline',
  '📝': 'create-outline',
  '📰': 'newspaper-outline',

  // 상태
  '⚠️': 'warning-outline',
  '⚠': 'warning-outline',
  '❌': 'close-circle-outline',
  '✅': 'checkmark-circle-outline',
  '⏳': 'hourglass-outline',
  '🔒': 'lock-closed-outline',
  '🔐': 'lock-closed-outline',
  '🔓': 'lock-open-outline',
  '❓': 'help-circle-outline',
  '💡': 'bulb-outline',
  '🔧': 'construct-outline',
  '🗑️': 'trash-outline',
  '🗑': 'trash-outline',

  // 성취·등급
  '🏆': 'trophy-outline',
  '🏅': 'medal-outline',
  '👑': 'ribbon-outline',
  '⭐': 'star-outline',
  '🌟': 'star-outline',
  '🎯': 'locate-outline',
  '🎉': 'sparkles-outline',
  '🎈': 'balloon-outline',
  '🎁': 'gift-outline',

  // 사람
  '👤': 'person-outline',
  '👥': 'people-outline',
  '🙋': 'hand-left-outline',

  // 미디어
  '🎥': 'videocam-outline',
  '📹': 'videocam-outline',
  '📺': 'tv-outline',
  '📷': 'camera-outline',
  '🖼️': 'image-outline',
  '🖼': 'image-outline',
  '🎨': 'color-palette-outline',

  // 쇼핑
  '🛍️': 'bag-handle-outline',
  '🛍': 'bag-handle-outline',
  '🛒': 'cart-outline',

  // 기타
  '📅': 'calendar-outline',
  '🏠': 'home-outline',
  '🌙': 'moon-outline',
  '☀️': 'sunny-outline',
  '📭': 'file-tray-outline',
  '😢': 'sad-outline',
  '❤️': 'heart',
  '❤': 'heart',
  '🤍': 'heart-outline',
  '🔥': 'flame-outline',
  '🚀': 'rocket-outline',
  '↗️': 'arrow-up-outline',
  '↗': 'arrow-up-outline',
  '👻': 'time-outline',
  '✨': 'sparkles-outline',
};

/** 매핑에 없을 때의 안전한 기본값 */
export const FALLBACK_ICON = 'ellipse-outline';

/** 이모지 문자열에서 아이콘 이름을 얻는다. */
export function iconForEmoji(emoji) {
  if (!emoji) return FALLBACK_ICON;
  // 변이 선택자(U+FE0F) 유무를 모두 시도
  return (
    EMOJI_ICON[emoji] ||
    EMOJI_ICON[emoji.replace(/️/g, '')] ||
    EMOJI_ICON[`${emoji}️`] ||
    FALLBACK_ICON
  );
}

export default EMOJI_ICON;
