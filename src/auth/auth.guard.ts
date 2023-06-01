import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JwtService } from '@nestjs/jwt'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Reflector } from '@nestjs/core'

@Injectable()
export class StrikrGuard implements CanActivate {
  constructor(private reflector: Reflector, private JwtService: JwtService) {}

  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context)
    const request = ctx.getContext().req
    const staffOnly = this.reflector.get<boolean>(
      'staffOnly',
      context.getHandler(),
    )
    const userOnly = this.reflector.get<boolean>(
      'userOnly',
      context.getHandler(),
    )

    if (!userOnly && !staffOnly) {
      return true
    }

    const token = request.headers.authorization?.split(' ')[1]

    if (!token) {
      throw new UnauthorizedException(
        'Token is required to perform this action',
      )
    }

    const payload = this.JwtService.verify(token)

    if (staffOnly && !payload.isStaff) {
      throw new ForbiddenException(
        'You are not authorized to perform staff actions.',
      )
    }

    const userId = ctx.getArgs()['id'] || ctx.getArgs()['userId']
    const authorId =
      ctx.getArgs()['GuideInputType']?.authorId ||
      ctx.getArgs()['GuideCreateInput']?.authorId ||
      ctx.getArgs()['GuideUpdateInput']?.authorId

    if (
      (userId && payload.id === userId) ||
      (authorId && payload.id === authorId) ||
      payload.isStaff
    ) {
      return true
    }

    throw new ForbiddenException(
      'You are not authorized to perform actions on other users.',
    )
  }
}
