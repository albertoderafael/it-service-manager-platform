package com.albertoderafael.itmanager.demand.port;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Read-only module boundary. No persistence entities cross this contract. */
public interface ApplicationCatalog {
    Optional<ApplicationSummary> findById(Long id);

    /** Returns existing applications only; missing IDs are absent from the map. */
    Map<Long, ApplicationSummary> findByIds(Set<Long> ids);
}
