import { render, screen } from '@testing-library/react-native';
import { EmptyState } from 'src/components/todo/EmptyState';

describe('EmptyState', () => {
  describe('렌더링', () => {
    it('empty-state testID가 존재한다', () => {
      render(<EmptyState />);

      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });

    it('Checkmark SVG 아이콘이 렌더링된다', () => {
      render(<EmptyState />);

      expect(screen.getByTestId('empty-state-checkmark')).toBeTruthy();
    });

    it('H2 "오늘의 할 일이 없어요" 텍스트가 표시된다', () => {
      render(<EmptyState />);

      expect(screen.getByText('오늘의 할 일이 없어요')).toBeTruthy();
    });

    it('안내 문구가 표시된다', () => {
      render(<EmptyState />);

      expect(
        screen.getByText(
          '우측 하단의 + 버튼을 눌러\n오늘의 계획을 추가해보세요',
        ),
      ).toBeTruthy();
    });
  });

  describe('스타일', () => {
    it('Indigo 50 라운드 컨테이너가 적용된다', () => {
      render(<EmptyState />);

      const iconContainer = screen.getByTestId('empty-state-icon-container');
      const style = iconContainer.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style)
        : style;

      expect(flatStyle.backgroundColor).toBe('#EEF2FF');
      expect(flatStyle.borderRadius).toBe(9999);
    });

    it('제목이 H2 스타일(18px/SemiBold)이다', () => {
      render(<EmptyState />);

      const title = screen.getByText('오늘의 할 일이 없어요');
      const style = title.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style)
        : style;

      expect(flatStyle.fontSize).toBe(18);
      expect(flatStyle.fontWeight).toBe('600');
    });

    it('안내 문구가 Caption 스타일(13px/Medium)이다', () => {
      render(<EmptyState />);

      const caption = screen.getByText(
        '우측 하단의 + 버튼을 눌러\n오늘의 계획을 추가해보세요',
      );
      const style = caption.props.style;
      const flatStyle = Array.isArray(style)
        ? Object.assign({}, ...style)
        : style;

      expect(flatStyle.fontSize).toBe(13);
      expect(flatStyle.fontWeight).toBe('500');
    });
  });
});
