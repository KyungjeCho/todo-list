import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAuth } from '../domain/user-auth.entity';
import { UserAuthOauth } from '../domain/user-auth-oauth.entity';
import { UserSession } from '../domain/user-session.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(UserAuth)
    private readonly userAuthRepo: Repository<UserAuth>,
    @InjectRepository(UserAuthOauth)
    private readonly oauthRepo: Repository<UserAuthOauth>,
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
  ) {}

  async findOauthByProvider(
    provider: string,
    providerUserId: string,
  ): Promise<UserAuthOauth | null> {
    return this.oauthRepo.findOne({
      where: { provider, providerUserId },
    });
  }

  async findOauthByProviderUserId(
    providerUserId: string,
  ): Promise<UserAuthOauth | null> {
    return this.oauthRepo.findOne({
      where: { providerUserId },
      relations: ['userAuth'],
    });
  }

  async createUserAuth(data: Partial<UserAuth>): Promise<UserAuth> {
    const id = randomUUID();
    const entity = this.userAuthRepo.create({
      ...data,
      id,
      createdBy: id,
      updatedBy: id,
    });
    return this.userAuthRepo.save(entity);
  }

  async createOauthAccount(
    data: Partial<UserAuthOauth>,
  ): Promise<UserAuthOauth> {
    const entity = this.oauthRepo.create(data);
    return this.oauthRepo.save(entity);
  }

  async createSession(data: Partial<UserSession>): Promise<UserSession> {
    const entity = this.sessionRepo.create(data);
    return this.sessionRepo.save(entity);
  }

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<UserSession | null> {
    return this.sessionRepo.findOne({ where: { refreshToken } });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepo.softDelete(sessionId);
  }
}
