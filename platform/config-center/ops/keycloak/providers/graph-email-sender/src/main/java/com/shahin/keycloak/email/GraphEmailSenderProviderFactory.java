/*
 * Factory for the Microsoft Graph email sender.
 *
 * Keycloak registers all EmailSenderProviderFactory implementations it
 * finds on the classpath via java.util.ServiceLoader, then picks the one
 * whose order() is highest. Keycloak's default ships at order 0, so we
 * return a positive order to win.
 */
package com.shahin.keycloak.email;

import org.keycloak.Config;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.email.EmailSenderProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

public class GraphEmailSenderProviderFactory implements EmailSenderProviderFactory {

    public static final String ID = "graph";

    @Override
    public EmailSenderProvider create(KeycloakSession session) {
        return new GraphEmailSenderProvider();
    }

    @Override
    public void init(Config.Scope config) {
        // no-op — all config comes from process environment
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // no-op
    }

    @Override
    public void close() {
        // no-op
    }

    @Override
    public String getId() {
        return ID;
    }

    @Override
    public int order() {
        // Must beat Keycloak's DefaultEmailSenderProviderFactory (order 0).
        return 100;
    }
}
