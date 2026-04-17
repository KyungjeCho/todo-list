import { render } from '@testing-library/react-native';
import {
  BellIcon,
  GlobeIcon,
  DocumentIcon,
  ShieldIcon,
  MailIcon,
  SpeakerIcon,
  LanguageIcon,
  ChevronRightIcon,
} from 'src/components/settings/SettingsIcons';

describe('SettingsIcons', () => {
  it('BellIcon renders without crashing', () => {
    const { toJSON } = render(<BellIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('BellIcon renders muted variant', () => {
    const { toJSON } = render(<BellIcon muted />);
    expect(toJSON()).toBeTruthy();
  });

  it('GlobeIcon renders without crashing', () => {
    const { toJSON } = render(<GlobeIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('DocumentIcon renders without crashing', () => {
    const { toJSON } = render(<DocumentIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('ShieldIcon renders without crashing', () => {
    const { toJSON } = render(<ShieldIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('MailIcon renders without crashing', () => {
    const { toJSON } = render(<MailIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('SpeakerIcon renders without crashing', () => {
    const { toJSON } = render(<SpeakerIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('SpeakerIcon renders muted variant', () => {
    const { toJSON } = render(<SpeakerIcon muted />);
    expect(toJSON()).toBeTruthy();
  });

  it('LanguageIcon renders without crashing', () => {
    const { toJSON } = render(<LanguageIcon />);
    expect(toJSON()).toBeTruthy();
  });

  it('ChevronRightIcon renders without crashing', () => {
    const { toJSON } = render(<ChevronRightIcon />);
    expect(toJSON()).toBeTruthy();
  });
});
