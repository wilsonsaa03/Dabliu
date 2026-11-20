package co.dabliu.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Documentación OpenAPI (Swagger UI en /swagger-ui.html cuando API_DOCS_ENABLED=true). */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI dabliuOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("DABLIU SaaS API")
                .version("v1")
                .description("""
                    API de DABLIU SOLUCIONES. Autenticación con cookies HttpOnly (dabliu_at / dabliu_rt).
                    Las operaciones que modifican datos exigen el encabezado X-XSRF-TOKEN con el valor de la
                    cookie XSRF-TOKEN (obtenla con GET /api/v1/auth/csrf). Para herramientas también se acepta
                    Authorization: Bearer <jwt>. Fechas en UTC (ISO-8601); moneda COP."""))
            .components(new Components().addSecuritySchemes("cookie",
                new SecurityScheme().type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("dabliu_at")))
            .addSecurityItem(new SecurityRequirement().addList("cookie"));
    }
}
