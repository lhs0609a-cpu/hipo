import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * OptimizedImage Component
 *
 * Features:
 * - Lazy loading with placeholder
 * - Error fallback image
 * - Loading indicator
 * - Automatic caching via React Native Image
 * - Support for various resize modes
 */
const OptimizedImage = ({
  source,
  style,
  placeholder,
  fallbackSource,
  resizeMode = 'cover',
  onLoad,
  onError,
  showLoadingIndicator = true,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSource, setCurrentSource] = useState(placeholder || null);

  useEffect(() => {
    // Reset state when source changes
    setLoading(true);
    setError(false);

    if (source) {
      setCurrentSource(source);
    }
  }, [source]);

  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleLoad = (event) => {
    setLoading(false);
    setError(false);
    onLoad?.(event);
  };

  const handleError = (event) => {
    setLoading(false);
    setError(true);

    if (fallbackSource) {
      setCurrentSource(fallbackSource);
    }

    onError?.(event);
  };

  return (
    <View style={[styles.container, style]}>
      {currentSource && (
        <Image
          source={currentSource}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {loading && showLoadingIndicator && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4caf50" />
        </View>
      )}

      {error && !fallbackSource && (
        <View style={[styles.errorContainer, style]}>
          <Image
            source={require('../../assets/placeholder.png')}
            style={[styles.image, style]}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default OptimizedImage;
