#include "de.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    Ctx ctx;
    construct_ctx(&ctx, "450 21041 57923 0999", strlen("450 21041 57923 0999"));
    int64_t v;
    int res;
    res = deserialize_int(&ctx, &v);
    printf("%d, %ld\n", res, v);
    ctx.idx += 1;
    res = deserialize_int(&ctx, &v);
    printf("%d, %ld\n", res, v);
    ctx.idx += 1;
    res = deserialize_int(&ctx, &v);
    printf("%d, %ld\n", res, v);
    ctx.idx += 1;
    res = deserialize_int(&ctx, &v);
    printf("%d, %s\n", res, ctx.error);
    destroy_ctx(&ctx);
}
