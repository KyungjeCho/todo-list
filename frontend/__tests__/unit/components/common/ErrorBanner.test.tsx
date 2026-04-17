import { render, screen } from '@testing-library/react-native';
import { ErrorBanner } from 'src/components/common/ErrorBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

describe('ErrorBanner', () => {
  it('renders nothing when error is null', () => {
    const { toJSON } = render(<ErrorBanner error={null} testID="err" />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when error is undefined', () => {
    const { toJSON } = render(<ErrorBanner testID="err" />);
    expect(toJSON()).toBeNull();
  });

  it('renders error message when error is set', () => {
    render(<ErrorBanner error="Something went wrong" testID="err" />);

    expect(screen.getByTestId('err')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('passes testID prop correctly', () => {
    render(<ErrorBanner error="fail" testID="my-error" />);
    expect(screen.getByTestId('my-error')).toBeTruthy();
  });
});
