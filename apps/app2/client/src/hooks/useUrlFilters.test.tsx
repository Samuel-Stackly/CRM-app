import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useUrlFilters } from './useUrlFilters'

const KEYS = ['search', 'category'] as const

function Probe() {
  const { values, page, setFilters, setPage, reset, activeCount } = useUrlFilters(KEYS)
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div>
      <output data-testid="search">{values.search}</output>
      <output data-testid="category">{values.category}</output>
      <output data-testid="page">{page}</output>
      <output data-testid="active">{activeCount}</output>
      <output data-testid="search-string">{location.search}</output>

      <button onClick={() => setFilters({ search: 'lamp' })}>set search</button>
      <button onClick={() => setFilters({ category: 'Home' })}>set category</button>
      <button onClick={() => setPage(3)}>go page 3</button>
      <button onClick={() => setPage(1)}>go page 1</button>
      <button onClick={reset}>reset</button>
      {/* MemoryRouter keeps its own history, so window.history.back() would do
          nothing here; navigate(-1) exercises the same entry stack the browser
          back button walks. */}
      <button onClick={() => navigate(-1)}>back</button>
    </div>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('useUrlFilters', () => {
  it('reads every requested axis from the URL', () => {
    renderAt('/products?search=lamp&category=Home&page=2')

    expect(screen.getByTestId('search').textContent).toBe('lamp')
    expect(screen.getByTestId('category').textContent).toBe('Home')
    expect(screen.getByTestId('page').textContent).toBe('2')
    expect(screen.getByTestId('active').textContent).toBe('2')
  })

  it('defaults to empty values and page 1', () => {
    renderAt('/products')

    expect(screen.getByTestId('search').textContent).toBe('')
    expect(screen.getByTestId('page').textContent).toBe('1')
    expect(screen.getByTestId('active').textContent).toBe('0')
  })

  it('writes a filter into the URL', async () => {
    const user = userEvent.setup()
    renderAt('/products')

    await user.click(screen.getByText('set search'))

    expect(screen.getByTestId('search-string').textContent).toContain('search=lamp')
  })

  it('resets to page 1 when a filter changes', async () => {
    const user = userEvent.setup()
    renderAt('/products?page=4')

    expect(screen.getByTestId('page').textContent).toBe('4')
    await user.click(screen.getByText('set category'))

    expect(screen.getByTestId('page').textContent).toBe('1')
    expect(screen.getByTestId('search-string').textContent).not.toContain('page=')
  })

  it('keeps other filters when one changes', async () => {
    const user = userEvent.setup()
    renderAt('/products?search=lamp')

    await user.click(screen.getByText('set category'))

    expect(screen.getByTestId('search').textContent).toBe('lamp')
    expect(screen.getByTestId('category').textContent).toBe('Home')
  })

  it('removes a filter when set to an empty value', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/products?search=lamp']}>
        <Routes>
          <Route
            path="/products"
            element={<ClearProbe />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByText('clear search'))
    expect(screen.getByTestId('search-string').textContent).not.toContain('search=')
  })

  it('omits page=1 from the URL rather than writing it', async () => {
    const user = userEvent.setup()
    renderAt('/products?page=3')

    await user.click(screen.getByText('go page 1'))

    expect(screen.getByTestId('search-string').textContent).not.toContain('page=')
  })

  it('writes a page beyond the first', async () => {
    const user = userEvent.setup()
    renderAt('/products')

    await user.click(screen.getByText('go page 3'))

    expect(screen.getByTestId('page').textContent).toBe('3')
    expect(screen.getByTestId('search-string').textContent).toContain('page=3')
  })

  it('reset clears everything', async () => {
    const user = userEvent.setup()
    renderAt('/products?search=lamp&category=Home&page=2')

    await user.click(screen.getByText('reset'))

    expect(screen.getByTestId('search-string').textContent).toBe('')
    expect(screen.getByTestId('active').textContent).toBe('0')
  })

  it('restores filter state on back navigation', async () => {
    const user = userEvent.setup()
    renderAt('/products')

    // setPage pushes a history entry, so the previous one is the unfiltered
    // view that back must restore.
    await user.click(screen.getByText('go page 3'))
    expect(screen.getByTestId('page').textContent).toBe('3')

    await user.click(screen.getByText('back'))

    expect(screen.getByTestId('page').textContent).toBe('1')
    expect(screen.getByTestId('search-string').textContent).not.toContain('page=')
  })

  it('does not stack a history entry per filter change', async () => {
    const user = userEvent.setup()
    renderAt('/products')

    // Filters replace rather than push, so back from a filtered view leaves
    // the list rather than stepping through every intermediate filter.
    await user.click(screen.getByText('set search'))
    await user.click(screen.getByText('set category'))
    expect(screen.getByTestId('active').textContent).toBe('2')

    await user.click(screen.getByText('back'))

    expect(screen.getByTestId('active').textContent).toBe('2')
  })
})

function ClearProbe() {
  const { setFilters } = useUrlFilters(KEYS)
  const location = useLocation()
  return (
    <div>
      <output data-testid="search-string">{location.search}</output>
      <button onClick={() => setFilters({ search: '' })}>clear search</button>
    </div>
  )
}
