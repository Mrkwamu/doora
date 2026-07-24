import { Test, TestingModule } from '@nestjs/testing';
import { LinkExtractorService } from './link-extractor.service';

describe('LinkExtractorService', () => {
  let service: LinkExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkExtractorService],
    }).compile();

    service = module.get<LinkExtractorService>(LinkExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
