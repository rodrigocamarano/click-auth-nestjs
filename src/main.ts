import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>(
      'CORS_ORIGIN',
      `http://localhost:${configService.get<number>('PORT', 8080)}`
    ),
    credentials: true,
  });

  const apiVersion = configService.get<string>('API_VERSION', 'v1');
  app.setGlobalPrefix(`api/${apiVersion}`);

  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED', 'true') === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(configService.get<string>('SWAGGER_TITLE', 'Click Auth API'))
      .setDescription(
        configService.get<string>(
          'SWAGGER_DESCRIPTION',
          'Complete Authentication System with NestJS, JWT, and RBAC'
        )
      )
      .setVersion(configService.get<string>('SWAGGER_VERSION', '1.0.0'))
      .addTag('auth', 'Authentication Endpoints')
      .addTag('users', 'User Management')
      .addTag('sessions', 'Session Management')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addServer(
        `http://localhost:${configService.get<number>('PORT', 8080)}`,
        'Development'
      )
      .addServer('https://api.clickauth.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api/docs');
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Click Auth API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
           .swagger-ui .topbar { display: none }
           .swagger-ui .info { margin: 50px 0 }
           .swagger-ui .info .title { color: #3b82f6 }
        `,
    });

    logger.log(
      `📚 Swagger Documentation: http://localhost:${configService.get<number>('PORT', 8080)}/${swaggerPath}`
    );
  }

  const port = configService.get<number>('PORT', 8080);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(
    `🌍 Environment: ${configService.get<string>('NODE_ENV', 'development')}`
  );
  logger.log(`📖 API Version: ${apiVersion}`);

  if (swaggerEnabled) {
    logger.log(
      `📚 Swagger Docs: http://localhost:${port}/${configService.get<string>('SWAGGER_PATH', 'api/docs')}`
    );
  }
}

bootstrap().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('❌ Error starting application:', error.message);
  } else {
    console.error(
      '❌ An unknown error occurred while starting the application:',
      error
    );
  }
  process.exit(1);
});
