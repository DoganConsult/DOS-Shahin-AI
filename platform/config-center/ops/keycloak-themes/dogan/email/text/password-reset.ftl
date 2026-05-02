<#outputformat "plainText">
${msg("brandName","Shahin-AI")} — Reset your password

Hello<#if user.firstName??> ${user.firstName}</#if>,

Someone asked to reset the password on your ${msg("brandName","Shahin-AI")} account.

Reset here:
${link}

This link expires in ${linkExpirationFormatter(linkExpiration)}.
If you didn't request a reset, ignore this email — your password won't change.

— ${msg("brandName","Shahin-AI")}
${properties.brandHomeUrl!'https://shahin-ai.com'}
</#outputformat>
