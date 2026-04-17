import { render, fireEvent, screen } from '@testing-library/react-native';
import { NotificationSettings } from 'src/components/settings/NotificationSettings';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

const defaultProps = {
  planEnabled: true,
  planTime: '08:00',
  defaultPlanTime: '08:00',
  reviewTime: '22:00',
  timePickerTarget: null as 'plan' | 'review' | null,
  onSetTimePickerTarget: jest.fn(),
  onTogglePlanNotification: jest.fn(),
  onToggleReviewNotification: jest.fn(),
  onTimeChange: jest.fn(),
};

describe('NotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('plan notification toggle renders and calls handler', () => {
    render(<NotificationSettings {...defaultProps} />);

    const toggle = screen.getByTestId('plan-notification-toggle');
    expect(toggle).toBeTruthy();

    fireEvent(toggle, 'valueChange', false);
    expect(defaultProps.onTogglePlanNotification).toHaveBeenCalledWith(false);
  });

  it('review notification toggle renders and calls handler', () => {
    render(<NotificationSettings {...defaultProps} />);

    const toggle = screen.getByTestId('review-notification-toggle');
    expect(toggle).toBeTruthy();

    fireEvent(toggle, 'valueChange', false);
    expect(defaultProps.onToggleReviewNotification).toHaveBeenCalled();
  });

  it('displays plan time when enabled', () => {
    render(<NotificationSettings {...defaultProps} />);

    expect(screen.getByTestId('plan-time-value')).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
  });

  it('displays review time', () => {
    render(<NotificationSettings {...defaultProps} />);

    expect(screen.getByTestId('review-time-value')).toBeTruthy();
    expect(screen.getByText('22:00')).toBeTruthy();
  });

  it('opens time picker when plan time button is pressed', () => {
    render(<NotificationSettings {...defaultProps} />);

    fireEvent.press(screen.getByTestId('plan-time-button'));
    expect(defaultProps.onSetTimePickerTarget).toHaveBeenCalledWith('plan');
  });

  it('opens time picker when review time button is pressed', () => {
    render(<NotificationSettings {...defaultProps} />);

    fireEvent.press(screen.getByTestId('review-time-button'));
    expect(defaultProps.onSetTimePickerTarget).toHaveBeenCalledWith('review');
  });
});
