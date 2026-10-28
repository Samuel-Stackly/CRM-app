import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library does not unmount automatically when globals are off,
// so a leftover tree from one test would still be in the document for the next.
afterEach(cleanup)
