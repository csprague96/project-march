export function normalizeForMatch(value = '') {
  return value
    .toString()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshteinDistance(a = '', b = '') {
  const first = normalizeForMatch(a)
  const second = normalizeForMatch(b)

  if (!first.length) {
    return second.length
  }

  if (!second.length) {
    return first.length
  }

  const matrix = Array.from({ length: second.length + 1 }, () => [])

  for (let row = 0; row <= second.length; row += 1) {
    matrix[row][0] = row
  }

  for (let column = 0; column <= first.length; column += 1) {
    matrix[0][column] = column
  }

  for (let row = 1; row <= second.length; row += 1) {
    for (let column = 1; column <= first.length; column += 1) {
      const substitutionCost = first[column - 1] === second[row - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      )
    }
  }

  return matrix[second.length][first.length]
}

function getWindows(words, size) {
  if (!words.length || !size) {
    return []
  }

  const windows = []

  for (let index = 0; index <= words.length - size; index += 1) {
    windows.push(words.slice(index, index + size).join(' '))
  }

  return windows
}

export function fuzzyIncludes(text = '', keyword = '', maxDistance = 2) {
  const normalizedText = normalizeForMatch(text)
  const normalizedKeyword = normalizeForMatch(keyword)

  if (!normalizedText || !normalizedKeyword) {
    return false
  }

  if (normalizedText.includes(normalizedKeyword)) {
    return true
  }

  const words = normalizedText.split(' ')
  const keywordParts = normalizedKeyword.split(' ')
  const windows = getWindows(words, keywordParts.length)

  return windows.some((windowValue) => levenshteinDistance(windowValue, normalizedKeyword) <= maxDistance)
}

export function getDictionaryMatches(text = '', dictionary = {}, maxDistance = 2) {
  const matches = new Set()

  Object.entries(dictionary).forEach(([keyword, translation]) => {
    if (fuzzyIncludes(text, keyword, maxDistance)) {
      matches.add(translation)
    }
  })

  return Array.from(matches)
}
