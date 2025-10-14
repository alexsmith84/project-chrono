<script lang="ts">
	import type { DataProvider } from '$lib/providers/types';
	import { providerRegistry } from '$lib/providers';

	export let provider: DataProvider;

	function toggleActive() {
		providerRegistry.toggleActive(provider.id);
		// Force reactivity
		provider = provider;
	}

	$: statusColor = {
		connected: '#059669',
		connecting: '#d97706',
		disconnected: '#6b7280',
		error: '#dc2626'
	}[provider.getConnectionStatus()];
</script>

<div class="provider-card" class:inactive={!provider.isActive}>
	<div class="card-header">
		<div class="provider-info">
			<div class="provider-icon" style="background-color: {provider.color}20">
				<div class="color-dot" style="background-color: {provider.color}"></div>
			</div>
			<div>
				<h3 class="provider-name">{provider.name}</h3>
				<p class="provider-category">{provider.category}</p>
			</div>
		</div>

		<div class="status-indicator" style="background-color: {statusColor}"></div>
	</div>

	<div class="card-body">
		<div class="metric">
			<span class="metric-label">Status</span>
			<span class="metric-value">{provider.getConnectionStatus()}</span>
		</div>

		<div class="metric">
			<span class="metric-label">Latency</span>
			<span class="metric-value">
				{provider.getLatency() ? `${provider.getLatency()}ms` : '-'}
			</span>
		</div>

		<div class="metric">
			<span class="metric-label">Last Update</span>
			<span class="metric-value">
				{provider.getLastUpdate()
					? new Date(provider.getLastUpdate()!).toLocaleTimeString()
					: '-'}
			</span>
		</div>
	</div>

	<div class="card-footer">
		<button
			class="toggle-button"
			class:active={provider.isActive}
			on:click={toggleActive}
		>
			{provider.isActive ? '✓ Included in Calculations' : '⏸ Excluded from Calculations'}
		</button>
	</div>
</div>

<style>
	.provider-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 20px;
		transition: all 0.3s ease;
	}

	.provider-card.inactive {
		opacity: 0.6;
		filter: grayscale(80%);
		border-style: dashed;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}

	.provider-info {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.provider-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.color-dot {
		width: 20px;
		height: 20px;
		border-radius: 50%;
	}

	.provider-name {
		font-size: 18px;
		font-weight: 700;
		margin: 0;
		color: #111827;
	}

	.provider-category {
		font-size: 13px;
		color: #6b7280;
		margin: 2px 0 0 0;
		text-transform: capitalize;
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: 0 0 0 3px currentColor;
		opacity: 0.3;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 16px;
	}

	.metric {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.metric-label {
		font-size: 13px;
		color: #6b7280;
		font-weight: 500;
	}

	.metric-value {
		font-size: 14px;
		color: #111827;
		font-weight: 600;
	}

	.card-footer {
		border-top: 1px solid #e5e7eb;
		padding-top: 16px;
	}

	.toggle-button {
		width: 100%;
		padding: 10px 16px;
		border-radius: 8px;
		border: 2px solid #e5e7eb;
		background: white;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		color: #6b7280;
	}

	.toggle-button:hover {
		border-color: #d1d5db;
		background: #f9fafb;
	}

	.toggle-button.active {
		background: #059669;
		border-color: #059669;
		color: white;
	}

	.toggle-button.active:hover {
		background: #047857;
		border-color: #047857;
	}
</style>
