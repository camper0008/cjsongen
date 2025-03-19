#include "de.h"
#include <string.h>

int main(void)
{
    Ctx ctx;
    construct_ctx(&ctx, "falsetruefalsefal", strlen("falsetruefalsefal"));
    bool b;
    int res;
    res = deserialize_bool(&ctx, &b);
    printf("%d, %s\n", res, b ? "true" : "false");
    res = deserialize_bool(&ctx, &b);
    printf("%d, %s\n", res, b ? "true" : "false");
    res = deserialize_bool(&ctx, &b);
    printf("%d, %s\n", res, b ? "true" : "false");
    res = deserialize_bool(&ctx, &b);
    printf("%d, %s\n", res, ctx.error);
}
