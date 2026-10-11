"""Referencias en APA 7: solo las obras citadas en el texto, en orden alfabético."""

from libro import escribir_rico

REFERENCIAS = [
    "Broadcom. (s.f.). *Spring Boot reference documentation*. "
    "https://docs.spring.io/spring-boot/",
    "Caddy. (s.f.). *Caddy documentation*. https://caddyserver.com/docs/",
    "Docker Inc. (s.f.). *Docker Compose documentation*. https://docs.docker.com/compose/",
    "Jones, M., Bradley, J. y Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). "
    "Internet Engineering Task Force. https://doi.org/10.17487/RFC7519",
    "Meta Open Source. (s.f.). *React*. https://react.dev/",
    "OWASP Foundation. (2021). *OWASP Top 10: 2021*. https://owasp.org/Top10/",
    "PostgreSQL Global Development Group. (s.f.). *PostgreSQL 16 documentation*. "
    "https://www.postgresql.org/docs/16/",
    "Red Gate Software. (s.f.). *Flyway documentation*. "
    "https://documentation.red-gate.com/flyway",
    "Vercel. (s.f.). *Next.js documentation*. https://nextjs.org/docs",
    "Vite. (s.f.). *Vite guide*. https://vite.dev/guide/",
]


def escribir(libro):
    for r in REFERENCIAS:
        escribir_rico(libro.doc.add_paragraph(style="Referencia"), r)
