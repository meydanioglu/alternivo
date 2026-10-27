using Discovery.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Discovery.Api.Infrastructure;

/// <summary>
/// Blocks content-creating actions (submissions, reviews, suggestions, reports, campaigns, purchases) until the
/// signed-in user has confirmed their e-mail address. Signing in and browsing stay open; the client gets a 403
/// with code "email_not_confirmed" so it can offer to resend the confirmation e-mail.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireConfirmedEmailAttribute : Attribute, IAsyncActionFilter
{
    public const string ErrorCode = "email_not_confirmed";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var users = http.RequestServices.GetRequiredService<UserManager<AppUser>>();
        var user = http.User.Identity?.IsAuthenticated == true ? await users.GetUserAsync(http.User) : null;
        if (user is not null && !user.EmailConfirmed)
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "Confirm your e-mail address first.",
                Detail = "We sent you a confirmation link when you registered. Confirm your e-mail, or request a new link from your account page.",
                Extensions = { ["code"] = ErrorCode },
            }) { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }
        await next();
    }
}
