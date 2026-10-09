<script lang="ts">
  interface Props {
    /** Lato in rem (default 2). */
    misura?: number;
  }
  let { misura = 2 }: Props = $props();
</script>

<span class="giro" style:--misura="{misura}rem" aria-hidden="true"></span>

<style>
  .giro {
    display: inline-block;
    flex: none;
    width: var(--misura);
    height: var(--misura);
    border: 4px solid var(--colore-contenitore-secondario);
    border-top-color: var(--colore-primario);
    border-radius: 50%;
    animation: gira 900ms linear infinite;
  }
  @keyframes gira {
    to {
      transform: rotate(360deg);
    }
  }
  /* Movimento ridotto: nessuna rotazione, resta un anello con un tratto marcato. */
  @media (prefers-reduced-motion: reduce) {
    .giro {
      animation: none;
    }
  }
</style>
