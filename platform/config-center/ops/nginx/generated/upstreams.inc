# AUTO-GENERATED — do not edit. Run: pnpm run generate:edge-config

upstream platform_gateway {
    server 127.0.0.1:4000;
}

upstream auth_service {
    server 127.0.0.1:4001;
}

upstream tenant_service {
    server 127.0.0.1:4002;
}

upstream user_service {
    server 127.0.0.1:4003;
}

upstream workflow_service {
    server 127.0.0.1:4004;
}

upstream notification_service {
    server 127.0.0.1:4005;
}

upstream audit_service {
    server 127.0.0.1:4006;
}

upstream product_shahin {
    server 127.0.0.1:3000;
}

