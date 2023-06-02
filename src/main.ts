import { NestFactory } from '@nestjs/core'
import { AppModule } from './app/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // cors: {
    //   origin: [
    //     '^((http?:\\/\\/)?.*?(172\\.245\\.142\\.218:3000))($|\\/.*$)',
    //     'http://172.245.142.218:3000',
    //     'http://179.106.175.51:3000',
    //     'https://strikr.gg',
    //   ],
    //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    //   preflightContinue: false,
    //   optionsSuccessStatus: 204,
    // },
  })
  await app.listen(5000)
}
bootstrap()
