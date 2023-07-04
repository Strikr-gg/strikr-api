import { Injectable } from '@nestjs/common'
import { CreateMatchInput } from './dto/create-match.input'
import { UpdateMatchInput } from './dto/update-match.input'

@Injectable()
export class MatchesService {
  create(createMatchInput: CreateMatchInput) {
    return 'This action adds a new match'
  }

  findAll() {
    return `This action returns all matches`
  }

  findOne(id: number) {
    return `This action returns a #${id} match`
  }

  update(id: number, updateMatchInput: UpdateMatchInput) {
    return `This action updates a #${id} match`
  }

  remove(id: number) {
    return `This action removes a #${id} match`
  }
}
