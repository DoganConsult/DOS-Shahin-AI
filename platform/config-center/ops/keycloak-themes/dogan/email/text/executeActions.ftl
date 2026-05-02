<#outputformat "plainText">
${msg("brandName","Shahin-AI")} — Update your account

Hello<#if user.firstName??> ${user.firstName}</#if>,

Your administrator has asked you to update your ${msg("brandName","Shahin-AI")} account.

Required action<#if requiredActions?size != 1>s</#if>:
<#list requiredActions as requiredAction>
  - ${msg("requiredAction.${requiredAction}")}
</#list>

Continue here:
${link}

This link is valid for ${linkExpirationFormatter(linkExpiration)}.
If you didn't start this, ignore this email.

— ${msg("brandName","Shahin-AI")}
${properties.brandHomeUrl!'https://shahin-ai.com'}
</#outputformat>
