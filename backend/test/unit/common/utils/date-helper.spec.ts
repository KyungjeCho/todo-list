import { DateHelper } from '../../../../src/common/utils/date-helper';

describe('DateHelper', () => {
  describe('getNextDate', () => {
    it('should return the next date for a regular date', () => {
      expect(DateHelper.getNextDate('2026-04-17')).toBe('2026-04-18');
    });

    it('should handle month-end rollover', () => {
      expect(DateHelper.getNextDate('2026-01-31')).toBe('2026-02-01');
    });

    it('should handle year-end rollover', () => {
      expect(DateHelper.getNextDate('2026-12-31')).toBe('2027-01-01');
    });

    it('should handle leap year (Feb 28 → Feb 29)', () => {
      expect(DateHelper.getNextDate('2028-02-28')).toBe('2028-02-29');
    });

    it('should handle leap year (Feb 29 → Mar 1)', () => {
      expect(DateHelper.getNextDate('2028-02-29')).toBe('2028-03-01');
    });

    it('should handle non-leap year (Feb 28 → Mar 1)', () => {
      expect(DateHelper.getNextDate('2026-02-28')).toBe('2026-03-01');
    });

    it('should handle month with 30 days', () => {
      expect(DateHelper.getNextDate('2026-04-30')).toBe('2026-05-01');
    });
  });
});
