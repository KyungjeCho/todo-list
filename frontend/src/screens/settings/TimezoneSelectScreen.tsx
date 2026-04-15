import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SoundPressable } from '../../components/common/SoundPressable';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../../theme';
import {
  getTimezoneEntries,
  formatTimezoneLabel,
  TZ_TO_COUNTRY_CITY,
} from '../../i18n/timezones';

interface TimezoneSelectScreenProps {
  current: string;
  onSelect: (timezone: string) => Promise<void>;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={colors.onSurface}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export const TimezoneSelectScreen: React.FC<TimezoneSelectScreenProps> = ({
  current,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // WHY: 모듈 스코프 캐시(오프셋 기준 정렬 완료)를 그대로 사용 → 화면 진입 시 재계산 없음
  const entries = useMemo(() => getTimezoneEntries(), []);

  const q = query.trim().toLowerCase();

  const currentEntry = useMemo(
    () => entries.find((e) => e.tz === current),
    [entries, current],
  );

  // WHY: 검색 중에도 현재 선택을 항상 최상단에 고정한다 (검색어와 무관).
  // 예: 현재 Asia/Seoul + 검색 "Tokyo" → [Asia/Seoul (고정), Asia/Tokyo, ...]
  //
  // WHY(FR-013): 검색 키는 (a) IANA 원문 (b) countryEn (c) cityEn 세 가지를 모두 포함해
  // "Korea"/"Seoul"/"South" 같은 영어 국가·도시 검색어로도 매칭되도록 한다.
  const otherMatches = useMemo(() => {
    const matches = (tz: string): boolean => {
      if (tz.toLowerCase().includes(q)) return true;
      const mapped = TZ_TO_COUNTRY_CITY[tz];
      if (!mapped) return false;
      return (
        mapped.countryEn.toLowerCase().includes(q) ||
        mapped.cityEn.toLowerCase().includes(q)
      );
    };
    const base = q === '' ? entries : entries.filter((e) => matches(e.tz));
    return base.filter((e) => e.tz !== current);
  }, [entries, q, current]);

  const listData = useMemo(
    () => (currentEntry ? [currentEntry, ...otherMatches] : otherMatches),
    [currentEntry, otherMatches],
  );

  // WHY: 검색어가 있고 현재 선택 외 추가 매칭이 없으며 현재 선택도 검색어에 매칭되지 않을 때만 "결과 없음"을 보여준다
  const currentMatchesQuery = (() => {
    if (!currentEntry) return false;
    if (currentEntry.tz.toLowerCase().includes(q)) return true;
    const mapped = TZ_TO_COUNTRY_CITY[currentEntry.tz];
    if (!mapped) return false;
    return (
      mapped.countryEn.toLowerCase().includes(q) ||
      mapped.cityEn.toLowerCase().includes(q)
    );
  })();
  const showNoResults =
    q !== '' && otherMatches.length === 0 && !currentMatchesQuery;

  const handleSelect = async (tz: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSelect(tz);
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('settings.settingsSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      testID="timezone-select-screen"
      style={styles.container}
      edges={['top']}
    >
      <View style={styles.header}>
        <SoundPressable
          testID="timezone-select-close"
          onPress={onClose}
          style={styles.closeButton}
        >
          <CloseIcon />
        </SoundPressable>
        <Text style={styles.title}>{t('settings.timezone')}</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          testID="timezone-search"
          value={query}
          onChangeText={setQuery}
          placeholder={t('timezone.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query !== '' && (
          <SoundPressable
            testID="timezone-search-clear"
            onPress={() => setQuery('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>✕</Text>
          </SoundPressable>
        )}
      </View>

      {listData.length === 0 ? (
        <View testID="timezone-empty" style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('timezone.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.tz}
          // WHY: 하단 제스처 바/홈 인디케이터에 마지막 항목이 가려지지 않도록 safe-area bottom inset만큼 여백 확보
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing.lg,
          }}
          // WHY: 모든 항목 높이가 동일하므로 getItemLayout 제공 시 초기 측정 비용이 사라져 스크롤이 매끄럽다
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          initialNumToRender={15}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={
            showNoResults ? (
              <View testID="timezone-empty" style={styles.emptyFooter}>
                <Text style={styles.emptyText}>{t('timezone.noResults')}</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const selected = item.tz === current;
            return (
              <SoundPressable
                testID={`timezone-item-${index}`}
                style={styles.item}
                onPress={() => handleSelect(item.tz)}
                disabled={submitting}
              >
                <View style={styles.itemTextContainer}>
                  <Text
                    style={[
                      styles.itemLabel,
                      selected && styles.itemLabelSelected,
                    ]}
                  >
                    {formatTimezoneLabel(item.tz)}
                  </Text>
                  <Text style={styles.itemOffset}>{item.offsetLabel}</Text>
                </View>
                {selected && (
                  <Text
                    testID={`timezone-item-${index}-selected`}
                    style={styles.checkMark}
                  >
                    ✓
                  </Text>
                )}
              </SoundPressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

// WHY: 모든 리스트 항목 높이가 동일 → getItemLayout으로 렌더 측정을 건너뛰기 위해 상수 유지
// (item paddingVertical(md) × 2 + label lineHeight + offset marginTop + offset lineHeight + border)
const ITEM_HEIGHT = spacing.md * 2 + 24 + 2 + 18 + 1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.onSurface,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceDim,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.onSurface,
    paddingVertical: spacing.md,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearText: {
    ...typography.body,
    color: colors.muted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    ...typography.body,
    color: colors.onSurface,
  },
  itemLabelSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  itemOffset: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  checkMark: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyFooter: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.muted,
  },
});
