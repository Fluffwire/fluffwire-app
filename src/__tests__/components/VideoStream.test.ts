import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VideoStream from '@/components/voice/VideoStream.vue'

describe('VideoStream', () => {
  let mockStream: MediaStream
  let mockVideoTrack: MediaStreamTrack

  beforeEach(() => {
    // Mock MediaStreamTrack
    mockVideoTrack = {
      id: 'mock-track-id',
      kind: 'video',
      readyState: 'live',
      enabled: true,
      muted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      stop: vi.fn(),
    } as unknown as MediaStreamTrack

    // Mock MediaStream
    mockStream = {
      id: 'mock-stream-id',
      getTracks: vi.fn(() => [mockVideoTrack]),
      getVideoTracks: vi.fn(() => [mockVideoTrack]),
      getAudioTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as unknown as MediaStream

    // Mock HTMLVideoElement play method and readyState
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    HTMLVideoElement.prototype.pause = vi.fn()

    // Mock readyState to HAVE_ENOUGH_DATA (4) so tests don't wait for canplay event
    Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
      writable: true,
      value: 4,
    })
  })

  it('should show empty state when stream is null', async () => {
    const wrapper = mount(VideoStream, {
      props: { stream: null },
    })

    await nextTick()
    expect(wrapper.text()).toContain('No stream')
  })

  it('should show loading state when track is muted', async () => {
    const mutedTrack = { ...mockVideoTrack, muted: true }
    const mutedStream = {
      ...mockStream,
      getVideoTracks: vi.fn(() => [mutedTrack]),
    } as unknown as MediaStream

    const wrapper = mount(VideoStream, {
      props: { stream: mutedStream },
    })

    await nextTick()
    expect(wrapper.text()).toContain('Loading video')
  })

  it('should show playing state after successful play', async () => {
    const wrapper = mount(VideoStream, {
      props: { stream: mockStream },
    })

    await nextTick()
    await nextTick() // Wait for play to resolve

    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.isVisible()).toBe(true)
  })

  it('should show error state on play failure', async () => {
    HTMLVideoElement.prototype.play = vi.fn().mockRejectedValue(new Error('Play failed'))

    const wrapper = mount(VideoStream, {
      props: { stream: mockStream },
    })

    await nextTick()
    await nextTick() // Wait for play to reject

    expect(wrapper.text()).toContain('Failed to load video')
  })

  it('should handle retry mechanism', async () => {
    let playCallCount = 0
    HTMLVideoElement.prototype.play = vi.fn().mockImplementation(() => {
      playCallCount++
      if (playCallCount === 1) {
        return Promise.reject(new Error('First attempt failed'))
      }
      return Promise.resolve()
    })

    const wrapper = mount(VideoStream, {
      props: { stream: mockStream },
    })

    await nextTick()
    await nextTick() // Wait for initial play to fail

    // Click retry button
    const retryButton = wrapper.find('button')
    expect(retryButton.exists()).toBe(true)
    await retryButton.trigger('click')

    await nextTick()
    await nextTick() // Wait for retry to succeed

    // Should now show video
    const video = wrapper.find('video')
    expect(video.isVisible()).toBe(true)
  })

  it('should handle track ended event', async () => {
    let endedCallback: (() => void) | undefined
    const trackWithEnded = {
      ...mockVideoTrack,
      addEventListener: vi.fn((event, callback) => {
        if (event === 'ended') {
          endedCallback = callback as () => void
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as MediaStreamTrack

    const streamWithEnded = {
      ...mockStream,
      getVideoTracks: vi.fn(() => [trackWithEnded]),
    } as unknown as MediaStream

    const wrapper = mount(VideoStream, {
      props: { stream: streamWithEnded },
    })

    await nextTick()
    await nextTick()

    // Trigger track ended
    if (endedCallback) {
      endedCallback()
      await nextTick()

      // Should show empty state
      expect(wrapper.text()).toContain('No stream')
    }
  })

  it('should cleanup on unmount without errors', async () => {
    const wrapper = mount(VideoStream, {
      props: { stream: mockStream },
    })

    await nextTick()
    await nextTick()

    // Get the video element before unmounting
    const video = wrapper.find('video').element as HTMLVideoElement

    // Verify stream is set (truthy, has the right stream ID)
    expect(video.srcObject).toBeTruthy()
    expect((video.srcObject as MediaStream)?.id).toBe('mock-stream-id')

    // Unmount should not throw errors
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('should cleanup on stream change', async () => {
    const wrapper = mount(VideoStream, {
      props: { stream: mockStream },
    })

    await nextTick()

    const pauseSpy = vi.spyOn(HTMLVideoElement.prototype, 'pause')

    // Change stream to null
    await wrapper.setProps({ stream: null })
    await nextTick()

    expect(pauseSpy).toHaveBeenCalled()
    expect(wrapper.text()).toContain('No stream')
  })

  it('should apply props correctly', async () => {
    const wrapper = mount(VideoStream, {
      props: {
        stream: mockStream,
        preview: true,
        muted: true,
        label: 'Test video',
        objectFit: 'cover',
      },
    })

    await nextTick()
    await nextTick()

    const video = wrapper.find('video')
    const videoElement = video.element as HTMLVideoElement

    // Check DOM properties (not attributes for boolean props)
    expect(videoElement.muted).toBe(true)
    expect(video.attributes('aria-label')).toBe('Test video')
    expect(video.classes()).toContain('object-cover')
  })

  it('should wait for unmute event when track is muted', async () => {
    let unmuteCallback: (() => void) | undefined
    const mutedTrack = {
      ...mockVideoTrack,
      muted: true,
      addEventListener: vi.fn((event, callback, options) => {
        if (event === 'unmute') {
          unmuteCallback = callback as () => void
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as MediaStreamTrack

    const mutedStream = {
      ...mockStream,
      getVideoTracks: vi.fn(() => [mutedTrack]),
    } as unknown as MediaStream

    const wrapper = mount(VideoStream, {
      props: { stream: mutedStream },
    })

    await nextTick()

    // Should show loading state
    expect(wrapper.text()).toContain('Loading video')

    // Trigger unmute
    if (unmuteCallback) {
      unmuteCallback()
      await nextTick()
      await nextTick()

      // Should now show video
      const video = wrapper.find('video')
      expect(video.isVisible()).toBe(true)
    }
  })

  it('should use custom slots', async () => {
    const wrapper = mount(VideoStream, {
      props: { stream: null },
      slots: {
        empty: '<div>Custom empty state</div>',
      },
    })

    await nextTick()
    expect(wrapper.text()).toContain('Custom empty state')
  })

  it('should handle error slot with props', async () => {
    HTMLVideoElement.prototype.play = vi.fn().mockRejectedValue(new Error('Test error'))

    const wrapper = mount(VideoStream, {
      props: { stream: mockStream },
      slots: {
        error: `
          <template #error="{ error, retry }">
            <div>
              <p>{{ error?.message }}</p>
              <button @click="retry">Retry custom</button>
            </div>
          </template>
        `,
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Test error')
    expect(wrapper.text()).toContain('Retry custom')
  })
})
