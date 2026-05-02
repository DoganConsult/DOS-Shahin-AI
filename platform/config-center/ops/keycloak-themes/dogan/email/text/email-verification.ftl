<#outputformat "plainText">
${msg("brandName","Shahin-AI")} — Verify your email

Welcome<#if user.firstName??> ${user.firstName}</#if>,

Someone created a ${msg("brandName","Shahin-AI")} account with this email.

Verify here:
${link}

Valid for ${linkExpirationFormatter(linkExpiration)}.
If this wasn't you, ignore this message.

— ${msg("brandName","Shahin-AI")}
${properties.brandHomeUrl!'https://shahin-ai.com'}
</#outputformat>
