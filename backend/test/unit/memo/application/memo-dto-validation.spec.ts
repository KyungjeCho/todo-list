import { validate } from 'class-validator';
import { CreateMemoDto } from '../../../../src/memo/application/dto/create-memo.dto';
import { UpdateMemoDto } from '../../../../src/memo/application/dto/update-memo.dto';
import { plainToInstance } from 'class-transformer';

describe('CreateMemoDto validation', () => {
  it('should pass when content is 5000 characters or less', async () => {
    const dto = plainToInstance(CreateMemoDto, {
      content: 'a'.repeat(4999),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when content is exactly 5000 characters (boundary)', async () => {
    const dto = plainToInstance(CreateMemoDto, {
      content: 'a'.repeat(5000),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when content is 5001 characters', async () => {
    const dto = plainToInstance(CreateMemoDto, {
      content: 'a'.repeat(5001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should pass when content is 5000 multi-byte characters (Korean)', async () => {
    const dto = plainToInstance(CreateMemoDto, {
      content: '가'.repeat(5000),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('UpdateMemoDto validation', () => {
  it('should pass when content is 5000 characters or less', async () => {
    const dto = plainToInstance(UpdateMemoDto, {
      content: 'a'.repeat(4999),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass when content is exactly 5000 characters (boundary)', async () => {
    const dto = plainToInstance(UpdateMemoDto, {
      content: 'a'.repeat(5000),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when content is 5001 characters', async () => {
    const dto = plainToInstance(UpdateMemoDto, {
      content: 'a'.repeat(5001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should pass when content is 5000 multi-byte characters (Korean)', async () => {
    const dto = plainToInstance(UpdateMemoDto, {
      content: '가'.repeat(5000),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
