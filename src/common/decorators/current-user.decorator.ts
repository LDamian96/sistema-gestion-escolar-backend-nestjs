import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Uso:
// @Get('profile')
// getProfile(@CurrentUser() user) { ... }
//
// @Get('school')
// getSchool(@CurrentUser('schoolId') schoolId: string) { ... }
