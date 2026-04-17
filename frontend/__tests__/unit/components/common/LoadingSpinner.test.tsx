import { render, screen } from '@testing-library/react-native';
import { LoadingSpinner } from 'src/components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders ActivityIndicator', () => {
    render(<LoadingSpinner testID="spinner" />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('passes testID prop correctly', () => {
    render(<LoadingSpinner testID="my-spinner" />);
    expect(screen.getByTestId('my-spinner')).toBeTruthy();
  });
});
