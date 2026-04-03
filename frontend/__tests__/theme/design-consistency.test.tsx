import { render, screen } from '@testing-library/react-native';
import { colors, typography, spacing, radius } from 'src/theme';
import { ModeToggle } from 'src/components/todo/ModeToggle';
import { CompleteDayButton } from 'src/components/todo/CompleteDayButton';

/**
 * 디자인 토큰 적용 검증 — 주요 컴포넌트의 스타일이 디자인 토큰을 참조하는지 확인
 */
describe('디자인 시스템 정합성', () => {
  describe('ModeToggle', () => {
    it('Secondary Pill 스타일이 디자인 토큰을 사용한다', () => {
      render(<ModeToggle mode="PLAN" onToggle={jest.fn()} />);

      const button = screen.getByTestId('mode-toggle-button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style;

      expect(flatStyle.backgroundColor).toBe(colors.borderLight);
      expect(flatStyle.borderRadius).toBe(spacing.lg);
    });

    it('텍스트가 caption 토큰을 사용한다', () => {
      render(<ModeToggle mode="PLAN" onToggle={jest.fn()} />);

      const text = screen.getByText('Review');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;

      expect(flatStyle.fontSize).toBe(typography.caption.fontSize);
      expect(flatStyle.fontWeight).toBe(typography.caption.fontWeight);
    });
  });

  describe('CompleteDayButton', () => {
    it('Primary 버튼이 디자인 토큰을 사용한다', () => {
      render(<CompleteDayButton onComplete={jest.fn()} />);

      const button = screen.getByTestId('complete-day-button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style;

      expect(flatStyle.backgroundColor).toBe(colors.primary);
      expect(flatStyle.borderRadius).toBe(radius.xl);
      expect(flatStyle.height).toBe(52);
    });

    it('버튼 텍스트가 body 토큰을 사용한다', () => {
      render(<CompleteDayButton onComplete={jest.fn()} />);

      const text = screen.getByText('일정 완료');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;

      expect(flatStyle.color).toBe(colors.surface);
      expect(flatStyle.fontSize).toBe(typography.body.fontSize);
      expect(flatStyle.fontWeight).toBe(typography.h2.fontWeight);
    });

    it('비활성 상태가 disabled 토큰 색상을 사용한다', () => {
      render(<CompleteDayButton onComplete={jest.fn()} isCompleted={true} />);

      const button = screen.getByTestId('complete-day-button');
      const flatStyle = Array.isArray(button.props.style)
        ? Object.assign({}, ...button.props.style)
        : button.props.style;

      expect(flatStyle.backgroundColor).toBe(colors.disabled);
    });

    it('에러 텍스트가 error 토큰 색상을 사용한다', () => {
      render(<CompleteDayButton onComplete={jest.fn()} error="에러 발생" />);

      const errorText = screen.getByText('에러 발생');
      const flatStyle = Array.isArray(errorText.props.style)
        ? Object.assign({}, ...errorText.props.style)
        : errorText.props.style;

      expect(flatStyle.color).toBe(colors.error);
    });

    it('이월 결과가 warning 토큰 색상을 사용한다', () => {
      render(
        <CompleteDayButton
          onComplete={jest.fn()}
          carriedOverResult={{
            carriedOverCount: 1,
            carriedOverTodos: [
              { fromTodoId: '1', toTodoId: '2', content: '테스트' },
            ],
          }}
        />,
      );

      const title = screen.getByText('이월됨');
      const flatStyle = Array.isArray(title.props.style)
        ? Object.assign({}, ...title.props.style)
        : title.props.style;

      expect(flatStyle.color).toBe(colors.warning);
    });
  });
});
