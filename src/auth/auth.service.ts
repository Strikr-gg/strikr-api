import { HttpException, Inject, Injectable, forwardRef } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { HttpStatusCode } from 'axios'
import { PrismaService } from 'src/prisma.service'
import * as bcrypt from 'bcrypt'
import { User } from '@prisma/client'
import { AuthInputType } from './auth.types'

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => PrismaService))
    private prisma: PrismaService,
    private jwtTokenService: JwtService,
  ) {}

  async validateUser(
    password: string,
    username?: string,
    email?: string,
  ): Promise<any> {
    if (!username && !email) {
      throw new HttpException(
        'Username or email is required',
        HttpStatusCode.Unauthorized,
      )
    }

    const user = await this.prisma.user.findUnique({
      where: {
        ...(username ? { username } : { email }),
      },
    })

    if (!user) {
      throw new HttpException('User not found', HttpStatusCode.NotFound)
    }

    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        username: user.username,
        email: user.email,
        id: user.id,
        isStaff: user.isStaff,
      }

      return {
        access_token: this.jwtTokenService.sign(payload),
      }
    }

    throw new HttpException('Invalid credentials', HttpStatusCode.Unauthorized)
  }

  async generateUserCredentials(user: User) {
    const payload = {
      email: user.email,
      username: user.username,
      id: user.id,
      isStaff: user.isStaff,
    }

    return {
      token: this.jwtTokenService.sign(payload),
    }
  }

  async loginUser(loginInput: AuthInputType) {
    const user = await this.prisma.user.findUnique({
      where: {
        ...(loginInput.username
          ? { username: loginInput.username }
          : { email: loginInput.email }),
      },
    })

    if (!user) {
      throw new HttpException('User not found', HttpStatusCode.NotFound)
    }

    return this.generateUserCredentials(user)
  }
  //
}
