import React from 'react';

interface DateTimePickerProps {
  testID?: string;
  mode?: string;
  value?: Date;
  onChange?: (event: unknown, date?: Date) => void;
}

const DateTimePicker = React.forwardRef<unknown, DateTimePickerProps>(
  function DateTimePicker({ testID, onChange, value }, _ref) {
    return React.createElement('DateTimePicker', {
      testID,
      value: value?.toISOString(),
      onChange: (e: { nativeEvent?: { timestamp?: number } }) => {
        if (onChange && e?.nativeEvent?.timestamp) {
          onChange(e, new Date(e.nativeEvent.timestamp));
        }
      },
    });
  },
);

export default DateTimePicker;
