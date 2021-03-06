import { applicationErrors } from '@common/applicationErrors'
import { CharacterJSON } from '../domain/Character'
import { CharacterRepositoryInterface } from './ports/CharacterRepositoryInterface'
import { WorldRepositoryInterface } from './ports/WorldRepositoryInterface'
import { EnsureCharacterPolicy } from '../domain/specification/EnsureCharacterPolicy'
import { CharacterCacheInterface } from './ports/CharacterCacheInterface'

interface AvailableCharacterJson extends CharacterJSON {
  name: string
  vocation: string
  fullVocation: string
  level: number
  isLookingForParty: boolean
}

interface PartyDto {
  character: CharacterJSON
  availableCharacters: AvailableCharacterJson[]
}

export class PartyService {
  constructor(
    private readonly characterRepository: CharacterRepositoryInterface,
    private readonly worldRepository: WorldRepositoryInterface,
    private readonly characterCache: CharacterCacheInterface,
  ) {}

  public async findPartyMembersForPlayer(
    playerName: string,
  ): Promise<PartyDto> {
    const character = await this.characterRepository.findOne(playerName)
    if (!character.world) {
      throw applicationErrors.notFound(`Cannot find character '${playerName}'`)
    }

    const loggedCharacters = await this.worldRepository.findOnlineUsers(
      character.world,
    )
    const ensureCharacterPolicy = new EnsureCharacterPolicy(character)
    const availableCharacters = loggedCharacters.filter((character) =>
      ensureCharacterPolicy.isSatisfiedBy(character),
    )

    const lastSearches = await this.characterCache.findLatestCharacterNamesSearchedByWorld(
      character.world,
    )
    await this.characterCache.saveLatestCharacterNameSearch(
      character.world,
      character.name,
    )

    return {
      character: character.toJson(),
      availableCharacters: availableCharacters.map((character) => ({
        ...character.toJson(),
        isLookingForParty: lastSearches.includes(character.name),
      })),
    }
  }
}
