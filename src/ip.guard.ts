import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { Reflector } from '@nestjs/core'

// This file is responsible for generalized authentication guard
// It should be used to protect routes that doesn't need specific permissions

// IP Whitelisting

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context)
    const request = ctx.getContext().req
    const whitelist = this.reflector.get<string[]>(
      'ipWhitelist',
      context.getHandler(),
    )
    const ipAddress = request.ip
    console.table({
      ipAddress,
      whitelist,
    })
    if (whitelist && whitelist.includes(ipAddress)) {
      return true
    }

    throw new ForbiddenException(
      'You do not have access to this API, your IP was logged and you can request access with Nodge#0001 on discord.',
    )
  }
}
