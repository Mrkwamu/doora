import { Test, TestingModule } from '@nestjs/testing';
import { PageFetcherService } from './page-fetcher.service';

describe('PageFetcherService', () => {
  let service: PageFetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PageFetcherService],
    }).compile();

    service = module.get<PageFetcherService>(PageFetcherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
