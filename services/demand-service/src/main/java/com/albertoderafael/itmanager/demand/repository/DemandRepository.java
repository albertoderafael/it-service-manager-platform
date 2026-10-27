package com.albertoderafael.itmanager.demand.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.albertoderafael.itmanager.demand.entity.Demand;

public interface DemandRepository extends JpaRepository<Demand, Long>,
        JpaSpecificationExecutor<Demand> {

    List<Demand> findByApplicationId(Long applicationId);
}
